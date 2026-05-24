const { REST, Routes } = require("discord.js");

const { CLIENT_ID, DISCORD_TOKEN, GUILD_ID } = require("../config");
const { commands } = require("./definitions");

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log(`Registered slash commands ${GUILD_ID ? "for the test server" : "globally"}.`);
}

module.exports = {
  registerCommands,
};
