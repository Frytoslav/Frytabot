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
    description: "Plays music in a voice channel.",
    options: [
      {
        name: "query",
        description: "Song link or search text.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
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

async function playTrack(interaction, track, voiceChannel) {
  const guildId = interaction.guildId;
  const stream = await play.stream(track.url);
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
  });

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
    session = { connection, player };
    sessions.set(guildId, session);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      sessions.delete(guildId);
    });
  }

  await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
  session.player.play(resource);

  session.player.once(AudioPlayerStatus.Idle, () => {
    getVoiceConnection(guildId)?.destroy();
    sessions.delete(guildId);
  });
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}.`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "play") {
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

  const query = interaction.options.getString("query", true);

  await interaction.deferReply();

  try {
    const track = await resolveTrack(query);

    if (!track) {
      await interaction.editReply("I could not find that track.");
      return;
    }

    await playTrack(interaction, track, voiceChannel);
    await interaction.editReply(`Now playing: **${track.title}**`);
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
