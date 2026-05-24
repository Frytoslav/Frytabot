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

function isInSameVoiceChannel(interaction, session) {
  return interaction.member?.voice?.channelId === session.voiceChannelId;
}

module.exports = {
  formatQueue,
  isInSameVoiceChannel,
};
