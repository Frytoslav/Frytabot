require("dotenv").config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

function validateConfig() {
  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("Missing DISCORD_TOKEN or CLIENT_ID. Fill in the .env file.");
    process.exit(1);
  }
}

module.exports = {
  CLIENT_ID,
  DISCORD_TOKEN,
  GUILD_ID,
  validateConfig,
};
