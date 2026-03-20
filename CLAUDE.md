# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Bluesky bot for Morriliebers (Morrissey tribute band) that announces continent-based tours spanning 2-4 weeks and then cancels individual shows 20-24 hours before showtime. The bot runs continuously, checking every 42 minutes for tour generation and cancellation triggers.

**Current Status**: Migrating from weekly concert system to continent-based tour system (see `docs/specs/2026-03-19-continent-tour-system-design.md`). Core tour generation and data model implemented, Bluesky integration and main orchestrator in progress.

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
# NOTE: These scripts need updating for tour system
npm run trigger:announce       # Generate and post weekly concerts (OLD - needs tour update)
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
  1. Should generate tour? (Any day 8:00-14:00, when all previous concerts canceled, max once per day)
  2. Are any concerts due for cancellation? (20-24h before showtime)

### State Management
- **Persistence**: `data/concerts.json` (created at runtime)
- **Structure**: Array of tours, each containing concerts, continent, dates, and post IDs
- **Data Model**:
  - `State`: `{ tours: Tour[], lastTourGenerationDate?: Date }`
  - `Tour`: continent, date range, concerts array, overview post + weekly reply posts
  - `Concert`: venue, date, cancellation date, weekInTour (1-4), canceled status
- **Serialization**: Dates converted to ISO strings, with validation on load
- **Storage module** (`storage.ts`): Handles file I/O, serialization, and error recovery

### Scheduling Logic (scheduler.ts)
Key functions determine bot behavior:
- `shouldGenerateTour(state)` - 8:00-14:00 check + all concerts canceled + day deduplication
- `hasActiveConcerts(tours)` - Checks if any concert across all tours is not canceled
- `getConcertsToCancelNow(tours)` - Filters concerts at/past cancellation time from all tours
- **Legacy**: `shouldPostWeeklyAnnouncement()`, `hasRemainingConcertsInWeek()` - kept for old tests

### Tour Generation (tourGenerator.ts)
**NEW SYSTEM** - Replaces `concertGenerator.ts`:
- **Tour length**: Random 2-4 weeks
- **Shows per week**: 2-3 concerts per week (random per week)
- **Continent selection**: Weighted by venue count (more venues = higher probability)
- **City selection**: N distinct cities from selected continent (no duplicates in same tour)
- **Scheduling**:
  - First show in week after announcement (never same week as announcement)
  - Valid days: Mon-Sun (all days)
  - Times: 17:00-23:30 in 30-minute intervals
- **Cancellation time**: Random 20-24 hours before each show
- **Key functions**: `selectContinent()`, `selectTourLength()`, `selectDistinctCities()`, `generateTour()`

### Bluesky Integration (blueskyClient.ts)
- Authentication via app password
- **NEW**: `postTourAnnouncement(tour)` - Overview post + weekly reply threads, returns all post URIs
  - Format: Overview with continent and date range, weekly replies with show details
  - No pinning (removed in new system)
- `postCancellation(concert)` - Individual cancellation post with AI-generated excuse
- **Legacy**: `postWeeklyAnnouncement()`, `pinPost()`, `unpinPost()` - to be removed

### Excuse Generation (excuseGenerator.ts)
- Uses Google Gemini via Vercel AI SDK
- Generates creative Spanish cancellation excuses
- Falls back to static message if API unavailable
- Requires `GOOGLE_GENERATIVE_AI_API_KEY` env var (optional)

### Venue System (venues.ts)
- **96+ venues across 48+ cities (4 continents)**
- **Minimum requirement**: 12 cities per continent (validated at startup)
- **Continent enum**: `NorthAmerica`, `SouthAmerica`, `Europe`, `Asia`
- Structure: `{ name, city, continent: Continent, capacity? }`
- `validateVenueData()` - Throws error if any continent has < 12 cities
- `getRandomVenue()` - Random venue selection
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

**Current**: 106 tests across test files in `src/__tests__/` (some failing during migration)
- **Test fixtures** (`fixtures.ts`): Updated for Tour data model with factory functions
- **Test helpers** (`helpers.ts`): Utilities for mocking time, randomness, filesystem
- **Isolation**: No network calls, no file writes, deterministic results
- **Coverage**: Core modules have tests; tour generator fully tested (13 tests)

**Migration Status**:
- ✅ `tourGenerator.test.ts` - All 13 tests passing
- ✅ `scheduler.test.ts` - Updated for tour system, all 25 tests passing
- ✅ `venues.test.ts` - Updated for Continent enum, all 12 tests passing
- ❌ `storage.test.ts` - Needs update for tour structure (8 tests failing)
- ⚠️ Other test files may need updates for new data model

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

The `docs/specs/` directory contains design specifications for significant architectural changes.

**Current Implementation (In Progress)**: Continent-based tour system per `docs/specs/2026-03-19-continent-tour-system-design.md`

**Completed**:
- ✅ Data model (Continent enum, Tour/Concert interfaces)
- ✅ Venue expansion (96+ venues, 48+ cities, 12+ per continent)
- ✅ Venue validation at startup
- ✅ Tour generator with weighted continent selection
- ✅ Tour-based scheduler (`shouldGenerateTour`, `hasActiveConcerts`)
- ✅ Storage serialization/deserialization

**In Progress**:
- 🚧 Bluesky client multi-post announcements
- 🚧 Main orchestrator tour generation flow
- 🚧 Update remaining tests for new data model
- 🚧 Update manual trigger scripts

**To Be Removed** (legacy code):
- `concertGenerator.ts` (replaced by `tourGenerator.ts`)
- Old scheduler functions (`shouldPostWeeklyAnnouncement`, `hasRemainingConcertsInWeek`)
- Pinning logic in Bluesky client

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
