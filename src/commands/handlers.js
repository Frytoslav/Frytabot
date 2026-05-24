const { handleDiceRoll } = require("../features/dice");
const { formatQueue, isInSameVoiceChannel } = require("../features/music/messages");
const {
  addTrack,
  destroySession,
  getActiveSession,
  getSession,
  resolveTrack,
  setSessionVolume,
} = require("../features/music/player");

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  switch (interaction.commandName) {
    case "queue":
      await handleQueue(interaction);
      return;
    case "r":
      await handleDiceRoll(interaction);
      return;
    case "volume":
      await handleVolume(interaction);
      return;
    case "stop":
      await handleStop(interaction);
      return;
    case "skip":
      await handleSkip(interaction);
      return;
    case "skipto":
      await handleSkipTo(interaction);
      return;
    case "play":
      await handlePlay(interaction);
      return;
    default:
      return;
  }
}

async function handleQueue(interaction) {
  const session = getActiveSession(interaction.guildId);

  await interaction.reply(session ? formatQueue(session) : "Queue is empty.");
}

async function handleVolume(interaction) {
  const session = getActiveSession(interaction.guildId);

  if (!session) {
    await replyNothingPlaying(interaction);
    return;
  }

  if (!(await requireSameVoiceChannel(interaction, session))) {
    return;
  }

  const level = interaction.options.getInteger("level", true);

  setSessionVolume(session, level);
  await interaction.reply(`Volume set to **${level}%**.`);
}

async function handleStop(interaction) {
  const session = getActiveSession(interaction.guildId);

  if (!session) {
    await replyNothingPlaying(interaction);
    return;
  }

  if (!(await requireSameVoiceChannel(interaction, session))) {
    return;
  }

  destroySession(interaction.guildId);
  await interaction.reply("Stopped playback and cleared the queue.");
}

async function handleSkip(interaction) {
  const session = getActiveSession(interaction.guildId);

  if (!session) {
    await replyNothingPlaying(interaction);
    return;
  }

  if (!(await requireSameVoiceChannel(interaction, session))) {
    return;
  }

  const skipped = session.current?.title;
  session.player.stop();
  await interaction.reply(skipped ? `Skipped: **${skipped}**` : "Skipped.");
}

async function handleSkipTo(interaction) {
  const session = getActiveSession(interaction.guildId);

  if (!session) {
    await replyNothingPlaying(interaction);
    return;
  }

  if (!(await requireSameVoiceChannel(interaction, session))) {
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
}

async function handlePlay(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply({
      content: "Join a voice channel first.",
      ephemeral: true,
    });
    return;
  }

  const existingSession = getSession(interaction.guildId);

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
}

async function replyNothingPlaying(interaction) {
  await interaction.reply({
    content: "Nothing is playing right now.",
    ephemeral: true,
  });
}

async function requireSameVoiceChannel(interaction, session) {
  if (isInSameVoiceChannel(interaction, session)) {
    return true;
  }

  await interaction.reply({
    content: "Join my voice channel first.",
    ephemeral: true,
  });
  return false;
}

module.exports = {
  handleInteraction,
};
