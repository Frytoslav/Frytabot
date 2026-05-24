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

const sessions = new Map();

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

function getSession(guildId) {
  return sessions.get(guildId);
}

function getActiveSession(guildId) {
  const session = sessions.get(guildId);

  if (!session || (!session.current && !session.queue.length)) {
    return null;
  }

  return session;
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

module.exports = {
  addTrack,
  destroySession,
  getActiveSession,
  getSession,
  resolveTrack,
  setSessionVolume,
};
