# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Bluesky bot for Morriliebers (Morrissey tribute band) that announces weekly concerts and then cancels them 20-24 hours before showtime. The bot runs continuously, checking every 42 minutes for announcement and cancellation triggers.

## Development Commands

```bash
# Development
npm run dev                    # Hot reload with tsx watch
npm run build                  # Compile TypeScript to dist/
npm start                      # Run production build

# Testing
npm test                       # Run all tests once
npm run test:watch             # Watch mode for TDD
npm run test:ui                # Vitest UI interface

# Manual Triggers (stop bot first to avoid state conflicts)
npm run trigger:announce       # Generate and post weekly concerts (bypasses Monday restriction)
npm run trigger:cancel-next    # Cancel next chronological concert
```

## Running Tests

The test suite uses Vitest with mocked dependencies (filesystem, time, Bluesky API). When running a single test file:

```bash
npx vitest src/scheduler.test.ts
npx vitest src/__tests__/blueskyClient.test.ts
```

## Architecture

### Core Loop (index.ts)
- Runs every 42 minutes via `setInterval`
- Checks two conditions each iteration:
  1. Should post weekly announcement? (Monday 10:00-14:00, once per week)
  2. Are any concerts due for cancellation? (20-24h before showtime)

### State Management
- **Persistence**: `data/concerts.json` (created at runtime)
- **Structure**: Array of concerts with dates, venue info, post IDs, pinning status
- **Serialization**: Dates converted to ISO strings, with validation on load
- **Storage module** (`storage.ts`): Handles file I/O, serialization, and error recovery

### Scheduling Logic (scheduler.ts)
Three key functions determine bot behavior:
- `shouldPostWeeklyAnnouncement(state)` - Monday 10:00-14:00 check + week deduplication
- `getConcertsToCancelNow(concerts)` - Filters concerts at/past cancellation time
- `hasRemainingConcertsInWeek(concert, allConcerts)` - Determines when to unpin announcements

### Concert Generation (concertGenerator.ts)
- Generates 1-3 concerts per week
- Valid days: Wed-Sun only (no Mon-Tue concerts)
- Times: 17:00-23:30 in 30-minute intervals
- Deduplicates days within same week
- Cancellation time: Random 20-24 hours before concert
- Venues: Selected randomly from `config/venues.json`

### Bluesky Integration (blueskyClient.ts)
- Authentication via app password
- `postWeeklyAnnouncement(concerts)` - Single post with all concerts, returns post URI
- `postCancellation(concert)` - Individual cancellation post with AI-generated excuse
- `pinPost(uri)` / `unpinPost()` - Profile pinning (announcements pinned until week ends)

### Excuse Generation (excuseGenerator.ts)
- Uses Google Gemini via Vercel AI SDK
- Generates creative Spanish cancellation excuses
- Falls back to static message if API unavailable
- Requires `GOOGLE_GENERATIVE_AI_API_KEY` env var (optional)

### Venue System (venues.ts)
- 60 venues across 30 cities (4 continents)
- Structure: `{ name, city, continent, capacity? }`
- `getRandomVenue()` uses weighted selection
- Data source: `config/venues.json`

## Important Patterns

### Date Handling
All dates are stored as Date objects in memory, serialized to ISO strings in JSON. Spain timezone is implicit for all scheduling logic.

### State Consistency
Always `await saveState(state)` after mutations. The bot saves state after every announcement, cancellation, and pin/unpin operation to survive crashes.

### Week Boundaries
Week starts on Monday (ISO 8601). The `getWeekStart()` utility (duplicated in multiple files) normalizes dates to Monday 00:00:00 for week comparisons.

### Post URIs
Bluesky posts return `at://` URIs used for:
- Pinning/unpinning
- Linking cancellations to original announcements
- State tracking (`postId`, `cancelPostId`)

## Testing Architecture

75 tests across 8 test files in `src/__tests__/`:
- **Test fixtures** (`fixtures.ts`): Shared mock data and factory functions
- **Test helpers** (`helpers.ts`): Utilities for mocking time, randomness, filesystem
- **Isolation**: No network calls, no file writes, deterministic results
- **Coverage**: All modules have corresponding `.test.ts` files

Key testing patterns:
- Mock `Date` via global assignment for time-dependent tests
- Mock `Math.random()` for deterministic venue/concert generation
- Mock filesystem via in-memory state for storage tests
- Mock Bluesky API with jest-like mock functions

## Environment Variables

```bash
# Required
BLUESKY_IDENTIFIER=handle.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Optional (falls back to static message)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

Get Bluesky app password: Settings > App Passwords in Bluesky app.

## File Structure Conventions

- `src/*.ts` - Core modules
- `src/scripts/*.ts` - Manual trigger scripts (share authentication via `utils.ts`)
- `src/__tests__/` - Test files and fixtures
- `config/` - Static data (venues)
- `data/` - Runtime state (gitignored, created on first run)
- `dist/` - Compiled output (gitignored)
- `docs/specs/` - Design specifications for architectural changes

## Design Evolution

The `docs/specs/` directory contains design specifications for significant architectural changes. The most recent spec (2026-03-19) describes a continent-based tour system that will replace the current weekly concert model. When implementing new features, check specs for planned changes to avoid conflicts.

## Deployment Notes

Production deployment uses pm2 process manager:
```bash
pm2 start dist/index.js --name morriliebers-bot
pm2 logs morriliebers-bot
```

Stop the bot before running manual trigger scripts to prevent state conflicts.

## TypeScript Configuration

- Target: ES2022
- Module: ES2022 with Node resolution
- Strict mode enabled
- Output: `dist/` directory
- Source maps and declarations enabled
- Test files excluded from compilation
