const { Client, GatewayIntentBits } = require("discord.js");

const { DISCORD_TOKEN, validateConfig } = require("./config");
const { handleInteraction } = require("./commands/handlers");
const { registerCommands } = require("./commands/register");
const { handleDiceMessage } = require("./features/dice");

validateConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}.`);
});

client.on("interactionCreate", handleInteraction);
client.on("messageCreate", handleDiceMessage);

async function start() {
  await registerCommands();
  await client.login(DISCORD_TOKEN);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
