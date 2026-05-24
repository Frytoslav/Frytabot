# Frytabot

A simple Discord bot that plays YouTube music with a per-server queue.

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

- `/play query:<link or search text>` - joins your voice channel and adds the found track to the queue.
- `/queue` - shows the currently playing track and up to 10 queued tracks.
- `/skip` - skips the current track.
- `/skipto position:<number>` - skips to a queued track by position.
- `/stop` - stops playback, clears the queue, and disconnects the bot.
