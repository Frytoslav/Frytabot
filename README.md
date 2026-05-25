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
   - `Message Content`
   - `Guild Voice States`

4. Invite the bot to your server with these permissions:

   - `applications.commands`
   - `Connect`
   - `Send Messages`
   - `Speak`
   - `View Channels`

5. Start the bot:

   ```bash
   npm start
   ```

## Commands

- `/play query:<link or search text>` - joins your voice channel and adds the found track to the queue.
- `/r <amount>d<sides>` - quick text command for rolling dice, for example `/r 2d6`.
- `/queue` - shows the currently playing track and up to 10 queued tracks.
- `/volume level:<0-200>` - changes playback volume for the current and next tracks.
- `/skip` - skips the current track.
- `/skipto position:<number>` - skips to a queued track by position.
- `/stop` - stops playback, clears the queue, and disconnects the bot.

## Project structure

- `src/index.js` - starts the Discord client and wires events.
- `src/config.js` - reads and validates environment variables.
- `src/commands/definitions.js` - contains slash command definitions registered with Discord.
- `src/commands/handlers.js` - routes interactions to feature handlers.
- `src/features/dice.js` - handles dice notation and roll responses.
- `src/features/music/` - contains music playback, queue state, and message formatting.
