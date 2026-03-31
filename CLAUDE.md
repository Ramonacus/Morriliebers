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

**Object-Oriented Design** with Domain-Driven Design principles:
- **Domain Layer**: Rich domain objects (Concert, Tour, BotState) own their behavior
- **Infrastructure Layer**: Persistence (StateRepository) and transport (BlueskyClient)
- **Main Loop**: Simplified orchestration using domain methods

### Core Loop (index.ts)
- Runs every 42 minutes via `setInterval`
- Uses domain objects to orchestrate bot behavior:
  1. `state.shouldGenerateTour(now)` - Checks time window (8-14h UTC) and business rules
  2. If yes: `Tour.generate()` → `tour.announce(client)` → `state.addTour(tour)` → `repository.save(state)`
  3. `state.getAllConcertsToCancel(now)` - Gets concerts due for cancellation
  4. For each: `concert.cancel(client)` → `repository.save(state)`

### Domain Layer

#### Concert (`src/domain/Concert.ts`)
- **Responsibilities**: Concert lifecycle, cancellation, excuse generation
- **Key methods**:
  - `shouldCancelNow(now)` - Checks if cancellation time has arrived
  - `isActive()` - Checks if not canceled
  - `cancel(client)` - Generates excuse (AI via Gemini) and posts cancellation
  - `markCanceled(postId)` - Updates internal state
  - `toJSON()` / `fromJSON()` - Serialization
- **State**: Immutable core properties, private mutable cancellation state

#### Tour (`src/domain/Tour.ts`)
- **Responsibilities**: Tour generation, announcement, concert management
- **Key methods**:
  - `Tour.generate(date)` - Static factory: creates tour with concerts (2-4 weeks, 2-3 shows/week)
  - `announce(client)` - Generates AI announcement and posts thread (overview + weekly replies)
  - `getConcertsToCancel(now)` - Filters concerts due for cancellation
  - `hasActiveConcerts()` - Checks for any active concerts
  - `getWeekCount()` - Returns maximum week number
  - `toJSON()` / `fromJSON()` - Serialization
- **Generation logic**:
  - Continent: Weighted by venue count
  - Cities: N distinct cities (no duplicates)
  - Scheduling: First show week after announcement, Mon-Sun, 17:00-23:30
  - Cancellation: Random 20-24h before each show

#### BotState (`src/domain/BotState.ts`)
- **Responsibilities**: Aggregate root for application state
- **Key methods**:
  - `shouldGenerateTour(now)` - Time window (8-14h UTC) + business rules
  - `getAllConcertsToCancel(now)` - Aggregates from all tours
  - `addTour(tour, date)` - Appends tour and tracks generation date
  - `getTours()` - Returns readonly tour collection
  - `toJSON()` / `fromJSON()` - Serialization

### Infrastructure Layer

#### StateRepository (`src/infrastructure/StateRepository.ts`)
- **Responsibilities**: State persistence with atomic writes
- **Key methods**:
  - `load()` - Deserializes from JSON, handles missing/corrupt files
  - `save(state)` - Serializes and atomically writes (temp + rename)
- **File**: `data/concerts.json` (created at runtime)

#### BlueskyClient (`src/infrastructure/BlueskyClient.ts`)
- **Responsibilities**: Bluesky API transport layer
- **Key methods**:
  - `authenticate()` - Login with app password
  - `post(text, reply?)` - Posts single message
  - `createThread(posts)` - Creates reply thread with retry logic
- Domain objects call these methods directly for posting

### Venue System (venues.ts)
- **96+ venues across 48+ cities (4 continents)**
- **Minimum requirement**: 12 cities per continent (validated at startup)
- **Continent enum**: `NorthAmerica`, `SouthAmerica`, `Europe`, `Asia`
- Structure: `{ name, city, continent: Continent, capacity? }`
- `validateVenueData()` - Throws error if any continent has < 12 cities
- `getRandomVenue()` - Random venue selection
- Data source: `config/venues.json`

## Testing Architecture

All tests passing with OO architecture.
- **Domain tests**: `src/domain/__tests__/` - Unit tests for Concert, Tour, BotState
- **Infrastructure tests**: `src/infrastructure/__tests__/` - Tests for StateRepository with mocked filesystem
- **Isolation**: No network calls, mocked dependencies, deterministic results
- **Coverage**: All domain objects and infrastructure components fully tested

## File Structure Conventions

- `src/index.ts` - Main entry point with core loop
- `src/domain/` - Domain objects (Concert, Tour, BotState)
- `src/domain/__tests__/` - Domain unit tests
- `src/infrastructure/` - Infrastructure layer (StateRepository, BlueskyClient)
- `src/infrastructure/__tests__/` - Infrastructure tests
- `src/scripts/` - Utility scripts (force-tour, cancel-next)
- `src/types.ts` - Shared types (Continent enum, Venue interface)
- `src/venues.ts` - Venue data loading and validation
- `config/` - Static data (venues.json)
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
