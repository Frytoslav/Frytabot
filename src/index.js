require("dotenv").config();

const {
  ApplicationCommandOptionType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
} = require("discord.js");
const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const play = require("play-dl");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID. Fill in the .env file.");
  process.exit(1);
}

const commands = [
  {
    name: "play",
    description: "Adds music to the queue.",
    options: [
      {
        name: "query",
        description: "Song link or search text.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "skip",
    description: "Skips the current track.",
  },
  {
    name: "skipto",
    description: "Skips to a track from the queue.",
    options: [
      {
        name: "position",
        description: "Queue position to skip to.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
      },
    ],
  },
  {
    name: "queue",
    description: "Shows the current music queue.",
  },
  {
    name: "volume",
    description: "Changes playback volume.",
    options: [
      {
        name: "level",
        description: "Volume percentage from 0 to 200.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 0,
        max_value: 200,
      },
    ],
  },
  {
    name: "stop",
    description: "Stops playback and clears the queue.",
  },
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const sessions = new Map();

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log(`Registered slash commands ${GUILD_ID ? "for the test server" : "globally"}.`);
}

async function resolveTrack(query) {
  if (play.yt_validate(query) === "video") {
    const info = await play.video_info(query);
    return {
      title: info.video_details.title,
      url: info.video_details.url,
    };
  }

  const results = await play.search(query, { limit: 1 });

  if (!results.length) {
    return null;
  }

  return {
    title: results[0].title,
    url: results[0].url,
  };
}

function getOrCreateSession(interaction, voiceChannel) {
  const guildId = interaction.guildId;
  let session = sessions.get(guildId);

  if (!session) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    connection.subscribe(player);
    session = {
      connection,
      current: null,
      player,
      queue: [],
      volume: 1,
      voiceChannelId: voiceChannel.id,
    };
    sessions.set(guildId, session);
    attachPlayerHandlers(session, guildId);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      sessions.delete(guildId);
    });
  }

  return session;
}

function destroySession(guildId) {
  const session = sessions.get(guildId);

  if (session) {
    session.queue = [];
    session.current = null;
    session.connection.destroy();
    sessions.delete(guildId);
    return;
  }

  getVoiceConnection(guildId)?.destroy();
}

async function playNext(guildId) {
  const session = sessions.get(guildId);

  if (!session) {
    return;
  }

  const track = session.queue.shift();

  if (!track) {
    destroySession(guildId);
    return;
  }

  session.current = track;

  try {
    const stream = await play.stream(track.url);
    const resource = createAudioResource(stream.stream, {
      inlineVolume: true,
      inputType: stream.type,
    });

    resource.volume.setVolume(session.volume);

    await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
    session.player.play(resource);
  } catch (error) {
    console.error(`Could not play "${track.title}".`, error);
    return playNext(guildId);
  }
}

async function addTrack(interaction, track, voiceChannel) {
  const guildId = interaction.guildId;
  const session = getOrCreateSession(interaction, voiceChannel);
  const wasIdle = session.player.state.status === AudioPlayerStatus.Idle && !session.current;

  session.queue.push(track);

  if (wasIdle) {
    await playNext(guildId);
  }

  return {
    position: session.queue.length,
    started: wasIdle,
  };
}

function formatQueue(session) {
  const lines = [];

  if (session.current) {
    lines.push(`Now playing: **${session.current.title}**`);
  }

  if (!session.queue.length) {
    lines.push("Queue is empty.");
    return lines.join("\n");
  }

  lines.push(
    ...session.queue.slice(0, 10).map((track, index) => `${index + 1}. ${track.title}`),
  );

  if (session.queue.length > 10) {
    lines.push(`...and ${session.queue.length - 10} more.`);
  }

  return lines.join("\n");
}

function getSessionForInteraction(interaction) {
  const session = sessions.get(interaction.guildId);

  if (!session || (!session.current && !session.queue.length)) {
    return null;
  }

  return session;
}

function isInSameVoiceChannel(interaction, session) {
  return interaction.member?.voice?.channelId === session.voiceChannelId;
}

function setSessionVolume(session, level) {
  session.volume = level / 100;

  const resource = session.player.state.resource;

  if (resource?.volume) {
    resource.volume.setVolume(session.volume);
  }
}

function attachPlayerHandlers(session, guildId) {
  session.player.removeAllListeners(AudioPlayerStatus.Idle);
  session.player.on(AudioPlayerStatus.Idle, () => {
    session.current = null;
    playNext(guildId);
  });
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}.`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "queue") {
    const session = getSessionForInteraction(interaction);

    await interaction.reply(session ? formatQueue(session) : "Queue is empty.");
    return;
  }

  if (interaction.commandName === "volume") {
    const session = getSessionForInteraction(interaction);

    if (!session) {
      await interaction.reply({
        content: "Nothing is playing right now.",
        ephemeral: true,
      });
      return;
    }

    if (!isInSameVoiceChannel(interaction, session)) {
      await interaction.reply({
        content: "Join my voice channel first.",
        ephemeral: true,
      });
      return;
    }

    const level = interaction.options.getInteger("level", true);

    setSessionVolume(session, level);
    await interaction.reply(`Volume set to **${level}%**.`);
    return;
  }

  if (interaction.commandName === "stop") {
    const session = getSessionForInteraction(interaction);

    if (!session) {
      await interaction.reply({
        content: "Nothing is playing right now.",
        ephemeral: true,
      });
      return;
    }

    if (!isInSameVoiceChannel(interaction, session)) {
      await interaction.reply({
        content: "Join my voice channel first.",
        ephemeral: true,
      });
      return;
    }

    destroySession(interaction.guildId);
    await interaction.reply("Stopped playback and cleared the queue.");
    return;
  }

  if (interaction.commandName === "skip") {
    const session = getSessionForInteraction(interaction);

    if (!session) {
      await interaction.reply({
        content: "Nothing is playing right now.",
        ephemeral: true,
      });
      return;
    }

    if (!isInSameVoiceChannel(interaction, session)) {
      await interaction.reply({
        content: "Join my voice channel first.",
        ephemeral: true,
      });
      return;
    }

    const skipped = session.current?.title;
    session.player.stop();
    await interaction.reply(skipped ? `Skipped: **${skipped}**` : "Skipped.");
    return;
  }

  if (interaction.commandName === "skipto") {
    const session = getSessionForInteraction(interaction);

    if (!session) {
      await interaction.reply({
        content: "Nothing is playing right now.",
        ephemeral: true,
      });
      return;
    }

    if (!isInSameVoiceChannel(interaction, session)) {
      await interaction.reply({
        content: "Join my voice channel first.",
        ephemeral: true,
      });
      return;
    }

    const position = interaction.options.getInteger("position", true);

    if (!session.queue.length) {
      await interaction.reply({
        content: "There are no queued tracks to skip to.",
        ephemeral: true,
      });
      return;
    }

    if (position < 1 || position > session.queue.length) {
      await interaction.reply({
        content: `Pick a position between 1 and ${session.queue.length}.`,
        ephemeral: true,
      });
      return;
    }

    const [target] = session.queue.splice(position - 1, 1);
    session.queue.unshift(target);
    session.player.stop();
    await interaction.reply(`Skipping to: **${target.title}**`);
    return;
  }

  if (interaction.commandName !== "play") {
    return;
  }

  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply({
      content: "Join a voice channel first.",
      ephemeral: true,
    });
    return;
  }

  const existingSession = sessions.get(interaction.guildId);

  if (existingSession && voiceChannel.id !== existingSession.voiceChannelId) {
    await interaction.reply({
      content: "Join my voice channel first.",
      ephemeral: true,
    });
    return;
  }

  const query = interaction.options.getString("query", true);

  await interaction.deferReply();

  try {
    const track = await resolveTrack(query);

    if (!track) {
      await interaction.editReply("I could not find that track.");
      return;
    }

    const { position, started } = await addTrack(interaction, track, voiceChannel);

    await interaction.editReply(
      started
        ? `Now playing: **${track.title}**`
        : `Added to queue #${position}: **${track.title}**`,
    );
  } catch (error) {
    console.error(error);
    await interaction.editReply("I could not play that track. Check the link or try another search.");
  }
});

async function start() {
  await registerCommands();
  await client.login(DISCORD_TOKEN);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
