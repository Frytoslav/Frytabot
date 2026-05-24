const { ApplicationCommandOptionType } = require("discord.js");

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
    name: "r",
    description: "Rolls dice using NdM notation.",
    options: [
      {
        name: "dice",
        description: "Dice notation, for example 2d6.",
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

module.exports = {
  commands,
};
