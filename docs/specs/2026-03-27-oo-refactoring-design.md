# Object-Oriented Refactoring Design

**Date**: 2026-03-27
**Status**: Design approved
**Goal**: Refactor procedural/functional codebase to object-oriented architecture with centralized state management

## Problem Statement

Current codebase issues:
- **State management scattered**: `loadState()`/`saveState()` functions, mutations in `actions.ts`, state passed through every function
- **No behavioral encapsulation**: Functions operate on Tour/Concert data instead of those entities having methods
- **Testing complexity**: Module-level mocking required, harder to test behaviors in isolation
- **Unclear ownership**: Business logic lives in free functions rather than with the data it operates on

## Design Approach

**Domain-Driven Design (Lite)**:
- Rich domain objects own their behavior and validation
- State management centralized in aggregate root (`BotState`)
- Clear separation: domain layer, persistence layer, service layer
- Preserve existing JSON data format for backward compatibility

## Architecture Overview

### Core Principles

1. **Domain objects own behavior**: Concert and Tour classes have methods, not just data
2. **Centralized state management**: BotState class is the single aggregate root
3. **Controlled mutation**: Changes happen through class methods, not direct property access
4. **Clear boundaries**: Domain, infrastructure, and service layers are distinct

### File Structure

```
src/
  domain/
    Concert.ts          # Concert class with behavior
    Tour.ts             # Tour class with behavior
    BotState.ts         # State aggregate root
  infrastructure/
    StateRepository.ts  # Persistence layer
    BlueskyClient.ts    # External API (existing, minor updates)
  services/
    TourGenerator.ts    # Tour creation service
    ExcuseGenerator.ts  # AI excuse generation (keep as-is)
    AnnouncementGenerator.ts # Tour announcements (keep as-is)
  index.ts              # Entry point, orchestration
  types.ts              # Continent enum, Venue interface
  venues.ts             # Venue data (keep as-is)
```

### Dependency Flow

```
index.ts (orchestration)
    ↓
BotState (aggregate root) ←→ StateRepository (persistence)
    ↓
Tour (collection management)
    ↓
Concert (individual behavior)
```

Services (TourGenerator, BlueskyClient) are injected dependencies.

## Domain Layer Design

### Concert Class

**Responsibilities**:
- Manage individual concert lifecycle
- Determine cancellation eligibility
- Track cancellation state

**Public API**:
```typescript
class Concert {
  readonly id: string;
  readonly venue: Venue;
  readonly date: Date;
  readonly cancellationDate: Date;
  readonly weekInTour: number;
  private _isCanceled: boolean;
  private _cancelPostId?: string;

  constructor(params: {
    id: string;
    venue: Venue;
    date: Date;
    cancellationDate: Date;
    weekInTour: number;
    isCanceled?: boolean;
    cancelPostId?: string;
  })

  // Queries
  shouldCancelNow(now: Date): boolean
  isActive(): boolean
  get isCanceled(): boolean
  get cancelPostId(): string | undefined

  // Commands
  markCanceled(postId: string): void

  // Serialization
  toJSON(): SerializedConcert
  static fromJSON(data: SerializedConcert): Concert
}
```

**Key behaviors**:
- `shouldCancelNow()`: Returns true if not canceled and cancellation date has passed
- `markCanceled()`: Sets canceled flag and post ID (one-time operation)
- Immutable core properties (id, venue, date, etc.)

### Tour Class

**Responsibilities**:
- Manage collection of concerts
- Aggregate concert queries (active concerts, cancellations due)
- Track tour-level metadata and announcement posts

**Public API**:
```typescript
class Tour {
  readonly id: string;
  readonly continent: Continent;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly announcementDate: Date;
  private _overviewPostId?: string;
  private _weeklyPostIds: string[];
  private _concerts: Concert[];

  constructor(params: {
    id: string;
    continent: Continent;
    startDate: Date;
    endDate: Date;
    announcementDate: Date;
    overviewPostId?: string;
    weeklyPostIds?: string[];
    concerts?: Concert[];
  })

  // Queries
  getConcerts(): readonly Concert[]
  getConcertsToCancel(now: Date): Concert[]
  hasActiveConcerts(): boolean
  getWeekCount(): number
  get overviewPostId(): string | undefined
  get weeklyPostIds(): readonly string[]

  // Commands
  addConcert(concert: Concert): void
  setAnnouncementPosts(overviewPostId: string, weeklyPostIds: string[]): void

  // Serialization
  toJSON(): SerializedTour
  static fromJSON(data: SerializedTour): Tour
}
```

**Key behaviors**:
- `getConcertsToCancel()`: Filters concerts that should cancel now
- `hasActiveConcerts()`: Checks if any concert is not canceled
- `addConcert()`: Adds concert to internal collection
- `setAnnouncementPosts()`: Records Bluesky post IDs after announcement

### BotState Class (Aggregate Root)

**Responsibilities**:
- Manage collection of tours
- Enforce business rules (tour generation timing, deduplication)
- Provide top-level queries across all tours

**Public API**:
```typescript
class BotState {
  private _tours: Tour[];
  private _lastTourGenerationDate?: Date;

  constructor(tours?: Tour[], lastTourGenerationDate?: Date)

  // Queries
  getTours(): readonly Tour[]
  shouldGenerateTour(now: Date): boolean
  getAllConcertsToCancel(now: Date): Concert[]
  get lastTourGenerationDate(): Date | undefined

  // Commands
  addTour(tour: Tour): void

  // Serialization
  toJSON(): SerializedState
  static fromJSON(data: SerializedState): BotState
}
```

**Key behaviors**:
- `shouldGenerateTour()`: Checks time window (8:00-14:00), all concerts canceled, not already generated today
- `getAllConcertsToCancel()`: Aggregates concerts to cancel across all tours
- `addTour()`: Adds tour to collection and sets lastTourGenerationDate to tour's announcement date

## Infrastructure Layer Design

### StateRepository Class

**Responsibilities**:
- Load/save BotState from/to JSON file
- Handle atomic writes (temp file + rename)
- Recover from corrupted state files
- Create data directory if needed

**Public API**:
```typescript
class StateRepository {
  private filePath: string;

  constructor(filePath: string = 'data/concerts.json')

  async load(): Promise<BotState>
  async save(state: BotState): Promise<void>
}
```

**Implementation details**:
- Uses `BotState.fromJSON()` and `state.toJSON()` for serialization
- Atomic writes via temp file + rename (existing pattern)
- Corrupted file backup (existing pattern)
- Creates empty state if file doesn't exist

### BlueskyClient Updates

**Minimal changes**:
- Keep existing class structure
- Update method signatures to accept domain objects (Tour, Concert) instead of interfaces
- Return types stay the same (post IDs)

**Methods remain**:
- `authenticate()`
- `postTourAnnouncement(tour: Tour)` - accepts Tour object
- `postCancellation(concert: Concert)` - accepts Concert object
- `postWeeklyAnnouncement()` - may be removed if unused

## Service Layer Design

### TourGenerator Service

**Current**: Free function `generateTour()`
**After**: Keep as class or namespace with static methods

```typescript
class TourGenerator {
  static generate(): Tour {
    const continent = TourGenerator.selectContinent();
    const weeks = TourGenerator.selectTourLength();
    // ... existing logic ...

    // Create Tour object with concerts
    return new Tour({
      id: randomUUID(),
      continent,
      startDate,
      endDate,
      announcementDate: new Date(),
      concerts: concerts.map(data => new Concert(data))
    });
  }

  // Keep existing helper methods as private static
  private static selectContinent(): Continent { ... }
  private static selectTourLength(): number { ... }
  private static selectDistinctCities(...): string[] { ... }
}
```

### Other Services

- `ExcuseGenerator`: Keep as-is (already uses AI SDK well)
- `AnnouncementGenerator`: Keep as-is

## Main Application Flow

### index.ts (Simplified)

```typescript
import { BotState } from './domain/BotState.js';
import { StateRepository } from './infrastructure/StateRepository.js';
import { BlueskyClient } from './infrastructure/BlueskyClient.js';
import { TourGenerator } from './services/TourGenerator.js';

const CHECK_INTERVAL_MS = 42 * 60 * 1000;

// Initialize
const repository = new StateRepository();
const client = new BlueskyClient(identifier, password);
await client.authenticate();

let state = await repository.load();

// Main loop
async function mainLoop(): Promise<void> {
  const now = new Date();

  // Tour generation
  if (state.shouldGenerateTour(now)) {
    const tour = TourGenerator.generate();
    const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);
    tour.setAnnouncementPosts(overviewPostId, weeklyPostIds);
    state.addTour(tour);
    await repository.save(state);
  }

  // Cancellations
  const concertsToCancel = state.getAllConcertsToCancel(now);
  for (const concert of concertsToCancel) {
    const postId = await client.postCancellation(concert);
    concert.markCanceled(postId);
    await repository.save(state);
  }
}

setInterval(mainLoop, CHECK_INTERVAL_MS);
```

**Key improvements**:
- No more `actions.ts` with helper functions
- No more passing state through function chains
- Business logic lives in domain objects
- Clear single responsibility for each class

## Testing Strategy

### Unit Tests

**Before** (procedural):
```typescript
// scheduler.test.ts - requires module-level mocking
import { shouldGenerateTour } from './scheduler.js';
// Mock time, state structure, etc.
```

**After** (OO):
```typescript
// BotState.test.ts - pure unit test
import { BotState } from './domain/BotState.js';

test('shouldGenerateTour returns true when conditions met', () => {
  const state = new BotState([], undefined);
  const now = new Date('2026-03-27T10:00:00');
  expect(state.shouldGenerateTour(now)).toBe(true);
});
```

**Benefits**:
- No mocking required for domain logic
- Tests are simpler and more focused
- Easy to test edge cases with controlled state

### Test Organization

```
src/domain/__tests__/
  Concert.test.ts       # Concert behavior tests
  Tour.test.ts          # Tour behavior tests
  BotState.test.ts      # State aggregate tests

src/infrastructure/__tests__/
  StateRepository.test.ts  # Persistence tests (mock fs)
  BlueskyClient.test.ts    # API tests (existing mocks)

src/services/__tests__/
  TourGenerator.test.ts    # Tour generation tests
```

### Integration Tests

Keep existing patterns for:
- Bluesky API mocking
- Filesystem mocking
- End-to-end flow tests

Update to use domain objects instead of raw interfaces.

## Migration Path

### Phase 1: Create Domain Classes
1. Create `src/domain/Concert.ts`
2. Create `src/domain/Tour.ts`
3. Create `src/domain/BotState.ts`
4. Implement serialization methods (toJSON/fromJSON)
5. Write unit tests for each class

**Success criteria**: All domain classes have tests, serialization round-trips work

### Phase 2: Create Infrastructure
1. Create `src/infrastructure/StateRepository.ts`
2. Migrate logic from `storage.ts`
3. Update `BlueskyClient.ts` to accept domain objects
4. Test repository with real/mock filesystem

**Success criteria**: Repository loads/saves domain objects, Bluesky client works with new types

### Phase 3: Update Services
1. Refactor `TourGenerator` to return domain objects
2. Keep `ExcuseGenerator` and `AnnouncementGenerator` as-is
3. Update tests

**Success criteria**: TourGenerator creates valid Tour objects

### Phase 4: Refactor Main Application
1. Update `index.ts` to use new architecture
2. Remove `actions.ts` (logic now in domain/main loop)
3. Update scripts (`force-tour.ts`, `cancel-next.ts`) to use new classes
4. Run integration tests

**Success criteria**: Bot runs with new architecture, all tests pass

### Phase 5: Cleanup
1. Delete `scheduler.ts` (logic in `BotState`)
2. Delete `storage.ts` (replaced by `StateRepository`)
3. Delete `actions.ts` (logic in main loop + domain)
4. Update `types.ts` to only export Continent/Venue
5. Update documentation

**Success criteria**: No dead code, documentation accurate

## Data Compatibility

### JSON Format Preserved

Existing `data/concerts.json` format remains unchanged:
```json
{
  "tours": [{
    "id": "uuid",
    "continent": "North America",
    "startDate": "2026-03-27T...",
    "concerts": [...]
  }],
  "lastTourGenerationDate": "2026-03-27T..."
}
```

Domain classes handle serialization internally:
- `BotState.fromJSON()` deserializes existing files
- `state.toJSON()` produces same format
- No migration script needed

## Benefits Summary

### Before (Procedural)
- State passed through every function
- Business logic in free functions
- Unclear ownership
- Complex test setup

### After (OO)
- State encapsulated in classes
- Business logic with data
- Clear responsibilities
- Simple unit tests

### Specific Improvements
1. **State management**: Single `StateRepository`, all mutations through methods
2. **Testing**: Domain objects testable without mocking
3. **Clarity**: Read `state.shouldGenerateTour()` instead of `shouldGenerateTour(state)`
4. **Maintenance**: Related behavior grouped in classes
5. **Type safety**: Methods enforce valid state transitions

## Non-Goals

- Changing JSON data format
- Introducing ORMs or databases
- Complex DDD patterns (repositories, factories, etc.)
- Microservices or distributed state
- GraphQL or REST API exposure

Keep it simple: just move from procedural to OO with better encapsulation.
