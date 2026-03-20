# CLAUDE.md

## Project Overview

Automated Bluesky bot for Morriliebers (Morrissey tribute band) that announces continent-based tours spanning 2-4 weeks and then cancels individual shows 20-24 hours before showtime. The bot runs continuously, checking every 42 minutes for tour generation and cancellation triggers.

**Current Status**: Continent-based tour system fully implemented (see `docs/specs/2026-03-19-continent-tour-system-design.md`). All legacy weekly concert code removed. System generates multi-week tours with multi-post Bluesky announcements.

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
- `postTourAnnouncement(tour)` - Overview post + weekly reply threads, returns all post URIs
  - Format: Overview with continent and date range, weekly replies with show details
  - English text with emoji flags for each continent
- `postCancellation(concert)` - Individual cancellation post with AI-generated excuse

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

## Testing Architecture

All tests passing after tour system migration and legacy code removal.
- **Test fixtures** (`fixtures.ts`): Factory functions for Tour data model
- **Test helpers** (`helpers.js`): Utilities for mocking time, randomness, filesystem
- **Isolation**: No network calls, no file writes, deterministic results
- **Coverage**: Core modules fully tested including tour generator, scheduler, storage, and Bluesky client

## File Structure Conventions

- `src/*.ts` - Core modules
- `src/scripts/*.ts` - Utility scripts for operations
- `src/__tests__/` - Test files and fixtures
- `config/` - Static data (venues)
- `data/` - Runtime state (gitignored, created on first run)
- `dist/` - Compiled output (gitignored)
- `docs/specs/` - Design specifications for architectural changes

## TypeScript Configuration

- Target: ES2022
- Module: ES2022 with Node resolution
- Strict mode enabled
- Output: `dist/` directory
- Source maps and declarations enabled
- Test files excluded from compilation
