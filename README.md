# Frytabot

A simple Discord bot that plays music with the `/play` command.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill it in:

   ```env
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GUILD_ID=your_test_server_id
   ```

3. In Discord Developer Portal, enable these bot intents:

   - `Guilds`
   - `Guild Voice States`

4. Invite the bot to your server with these permissions:

   - `applications.commands`
   - `Connect`
   - `Speak`

5. Start the bot:

   ```bash
   npm start
   ```

## Commands

- `/play query:<link or search text>` - joins your voice channel and plays the found track.
