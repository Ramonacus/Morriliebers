# Morriliebers Bluesky Bot

Automated Bluesky bot for Morriliebers (Morrissey tribute band) that announces weekly concerts and then cancels them 20-24 hours before showtime.

## Features

- 📅 Generates 1-3 concerts per week for Spanish venues
- 📢 Posts weekly announcement every Monday (10:00-14:00)
- 📌 Pins announcements to profile
- ❌ Cancels concerts 20-24 hours before showtime
- 🇪🇸 All messages in Spanish

## Prerequisites

- Node.js 18+
- Bluesky account with app password
- (Optional) Google Gemini API key for AI-generated cancellation excuses

## Dependencies

The project uses:
- `ai` - Vercel AI SDK
- `@ai-sdk/google` - Google Gemini integration
- `@atproto/api` - Bluesky API client

## Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd morriliebers-bot
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Bluesky credentials
   ```

3. **Get Bluesky app password:**
   - Go to Settings > App Passwords in Bluesky
   - Create a new app password
   - Add it to `.env`

## Environment Variables

### Bluesky Authentication

```bash
BLUESKY_IDENTIFIER=your-handle.bsky.social
BLUESKY_PASSWORD=your-app-password
```

### Google Gemini AI

The bot uses Google Gemini to generate creative cancellation excuses.

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

The bot will fall back to a static message if the API key is not configured or if the Gemini API is unavailable.

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Production Deployment

Using pm2 for process management:

```bash
# Install pm2 globally
npm install -g pm2

# Build the project
npm run build

# Start with pm2
pm2 start dist/index.js --name morriliebers-bot

# Save pm2 configuration
pm2 save

# Configure pm2 to start on boot
pm2 startup
```

## Manual Commands

For testing or manual control, you can trigger announcements and cancellations directly:

```bash
# Generate and announce weekly concerts
# (bypasses Monday 10-14h restriction)
npm run trigger:announce

# Cancel the next chronologically upcoming concert
npm run trigger:cancel-next
```

**Important:** Stop the bot (`pm2 stop morriliebers-bot`) before running manual commands to prevent state conflicts.

## How It Works

1. **Every 42 minutes**, the bot checks:
   - Is it Monday 10:00-14:00? → Generate and post weekly concerts
   - Are any concerts 20-24 hours away? → Post cancellation

2. **Weekly announcements** (Monday):
   - Generates 1-3 concerts for Wed-Sun
   - Times: 17:00-23:30 (30-minute intervals)
   - Posts single announcement with all concerts
   - Pins the announcement

3. **Cancellations** (20-24h before concert):
   - Posts: "Morriliebers lamenta anunciar la cancelación de su concierto en {venue} del día {dd/mm}"
   - Unpins announcement if no concerts remain for the week

## Venues

13 venues across Spanish cities (500k+ population):
- Madrid: 6 venues
- Barcelona: 3 venues
- Valencia: 2 venues
- Sevilla: 1 venue
- Zaragoza: 1 venue

Edit `config/venues.json` to modify the venue list.

## Testing

The project includes comprehensive unit tests using Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Coverage

- **Scheduler** (17 tests): `shouldPostWeeklyAnnouncement`, `getConcertsToCancelNow`, `hasRemainingConcertsInWeek`
- **Venues** (8 tests): Random venue selection, data validation
- **Concert Generator** (11 tests): Generation logic, time/day constraints, concert properties
- **Storage** (12 tests): State serialization, `loadState`, `saveState`, error handling
- **Bluesky Client** (8 tests): Authentication, post creation, pin/unpin functionality
- **Script Utilities** (9 tests): Authentication, state loading, exit handling
- **Announce Script** (4 tests): Concert generation, posting, pinning, error handling
- **Cancel-Next Script** (6 tests): Concert selection, cancellation, unpinning logic

**Total: 75 tests** covering all core modules with mocked dependencies.

### Test Architecture

- **Mocked dependencies**: File system, time, randomness, Bluesky API
- **Test fixtures**: Shared mock data and factory functions in `src/__tests__/fixtures.ts`
- **Test helpers**: Utility functions for mocking in `src/__tests__/helpers.ts`
- **Isolated tests**: No network calls, no file system writes, deterministic results

## Project Structure

```
morriliebers-bot/
├── src/
│   ├── index.ts              # Main orchestrator
│   ├── types.ts              # TypeScript interfaces
│   ├── venues.ts             # Venue data & selection
│   ├── storage.ts            # State persistence
│   ├── concertGenerator.ts   # Concert generation
│   ├── blueskyClient.ts      # Bluesky API wrapper
│   ├── scheduler.ts          # Scheduling logic
│   └── scripts/              # Manual trigger scripts
│       ├── utils.ts          # Shared script utilities
│       ├── announce.ts       # Manual announcement trigger
│       └── cancel-next.ts    # Manual cancellation trigger
├── config/
│   └── venues.json           # Venue list
├── data/
│   └── concerts.json         # State file (created at runtime)
└── dist/                     # Compiled JavaScript
```

## Monitoring

```bash
# View logs
pm2 logs morriliebers-bot

# Check status
pm2 status

# Restart bot
pm2 restart morriliebers-bot
```

## License

MIT
