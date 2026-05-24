const { Client, GatewayIntentBits } = require("discord.js");

const { DISCORD_TOKEN, validateConfig } = require("./config");
const { handleInteraction } = require("./commands/handlers");
const { registerCommands } = require("./commands/register");

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}.`);
});

client.on("interactionCreate", handleInteraction);

async function start() {
  await registerCommands();
  await client.login(DISCORD_TOKEN);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
