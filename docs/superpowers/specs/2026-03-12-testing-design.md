# Testing Implementation Design

**Date:** 2026-03-12
**Project:** Morriliebers Bluesky Bot
**Scope:** Comprehensive unit testing implementation

## Overview

This design document outlines the implementation of a comprehensive unit testing suite for the Morriliebers Bluesky bot. The bot automates concert announcements and cancellations, and requires testing for concert generation, scheduling logic, venue selection, state persistence, and Bluesky API interactions.

## Requirements

- Comprehensive unit tests for all modules
- Fast, isolated test execution
- Mock external dependencies (API, filesystem, time)
- TypeScript support
- Multiple test commands (run, watch, UI)
- No code coverage enforcement

## Testing Framework

### Framework Selection: Vitest

**Rationale:**
- Modern, fast test framework built on Vite
- Excellent TypeScript support out of the box
- ESM-first architecture (matches project's ES2022 modules)
- Jest-compatible API (easy migration path if needed)
- Built-in mocking utilities
- Optional UI for test visualization

### Dependencies

**Production dependencies:** None (tests don't affect runtime)

**Development dependencies:**
```json
{
  "vitest": "^1.0.0",
  "@vitest/ui": "^1.0.0"
}
```

### Configuration

**File:** `vitest.config.ts` (project root)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
});
```

**Configuration rationale:**
- `globals: true` - Enables `describe`, `it`, `expect` without imports
- `environment: 'node'` - Node.js runtime (not browser)
- `include` pattern catches all test files in src/

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

- `test` - Run all tests once (for CI/CD)
- `test:watch` - Watch mode for development
- `test:ui` - Visual test interface at http://localhost:51204

## Test Structure

### Directory Layout

```
src/
├── __tests__/
│   ├── fixtures.ts              # Shared test data
│   ├── helpers.ts               # Test utilities
│   ├── concertGenerator.test.ts
│   ├── scheduler.test.ts
│   ├── venues.test.ts
│   ├── storage.test.ts
│   └── blueskyClient.test.ts
├── concertGenerator.ts
├── scheduler.ts
├── venues.ts
├── storage.ts
├── blueskyClient.ts
├── index.ts
└── types.ts
```

**Rationale for `src/__tests__/` structure:**
- Common Vitest/Jest convention
- Tests clearly separated but discoverable
- Easy to share fixtures and helpers
- Avoids cluttering src/ with test files
- Simple glob pattern to include/exclude

### Test Files

Each module gets a corresponding test file:

1. **`concertGenerator.test.ts`** - Concert generation logic
2. **`scheduler.test.ts`** - Scheduling and timing logic
3. **`venues.test.ts`** - Venue selection
4. **`storage.test.ts`** - State persistence
5. **`blueskyClient.test.ts`** - API client with mocks

## Test Coverage by Module

### 1. concertGenerator.test.ts

**Function:** `generateWeeklyConcerts(referenceDate?: Date): Concert[]`

**Test cases:**
- Generates 1-3 concerts (random but verifiable with mocked Math.random)
- All concerts scheduled Wed-Sun only (days 3, 4, 5, 6, 0)
- Concert times between 17:00-23:30
- Times in 30-minute intervals
- No duplicate days within same week
- Each concert has valid venue
- Cancellation dates are 20-24 hours before concert
- Concerts sorted chronologically by date
- Correct week calculation for reference date
- Handles edge cases (end of month, year boundaries)

**Mocking strategy:**
- Mock `Math.random()` to control random generation
- Mock current date with `vi.setSystemTime()`
- Mock `getRandomVenue()` to return known venues

**Key assertions:**
- Verify concert count (1-3)
- Verify day of week for each concert
- Verify time slots (17:00-23:30, 30-min intervals)
- Verify no duplicate days
- Verify cancellation timing (20-24h before)
- Verify sort order

### 2. scheduler.test.ts

**Function:** `shouldPostWeeklyAnnouncement(state: State): boolean`

**Test cases:**
- Returns `true` on Monday 10:00-13:59
- Returns `false` on Monday outside 10:00-14:00 window
- Returns `false` on non-Monday days
- Returns `false` if already posted this week
- Returns `true` if posted last week but not this week
- Handles null/undefined lastAnnouncementDate

**Function:** `getConcertsToCancelNow(concerts: Concert[]): Concert[]`

**Test cases:**
- Returns concerts past cancellation date
- Excludes already-canceled concerts
- Handles concerts without cancellation dates
- Returns empty array when no concerts to cancel
- Respects current time boundary

**Function:** `hasRemainingConcertsInWeek(canceledConcert: Concert, allConcerts: Concert[]): boolean`

**Test cases:**
- Returns `true` when uncanceled concerts remain in same week
- Returns `false` when all concerts in week are canceled
- Correctly identifies week boundaries (Mon-Sun)
- Handles edge cases at week boundaries

**Mocking strategy:**
- Use `vi.setSystemTime()` to control current date/time
- Test across different days of week and hours
- Test week boundaries

**Key assertions:**
- Boolean return values match expected conditions
- Correct filtering of concerts
- Proper date comparisons

### 3. venues.test.ts

**Function:** `getRandomVenue(): Venue`

**Test cases:**
- Returns valid Venue object
- Venue has required fields (name, city)
- Venue may have optional capacity field
- Randomness can be controlled with Math.random mock
- All venues in dataset are accessible

**Additional tests:**
- Verify venue data structure
- Ensure all venue objects are well-formed
- Test that venue selection is random (without mock)

**Mocking strategy:**
- Mock `Math.random()` to select specific venues
- Or test statistical distribution over many calls

**Key assertions:**
- Returned object matches Venue interface
- All required fields present
- Values are strings

### 4. storage.test.ts

**Functions:** State serialization and persistence

**Test cases:**
- Serialize state: converts Date objects to ISO strings
- Deserialize state: converts ISO strings back to Dates
- Round-trip preserves all data
- Handles missing optional fields (cancellationDate, postId, etc.)
- File write operations (mocked)
- File read operations (mocked)
- Error handling for missing files
- Error handling for corrupted JSON

**Mocking strategy:**
- Mock `fs/promises` (readFile, writeFile)
- Control file existence and contents
- Simulate file system errors

**Key assertions:**
- Dates correctly serialized to strings
- Strings correctly deserialized to Dates
- All concert properties preserved
- Proper error handling

### 5. blueskyClient.test.ts

**Bluesky API client wrapper**

**Test cases:**
- **Login:**
  - Successful login with valid credentials
  - Failed login with invalid credentials
  - Network error handling

- **Post creation:**
  - Successful post returns post URI
  - Post content formatted correctly
  - Error handling for failed posts

- **Post pinning:**
  - Successfully pins post
  - Successfully unpins post
  - Error handling for pin/unpin failures

- **Multiple operations:**
  - Login called before other operations
  - Proper sequencing of API calls

**Mocking strategy:**
- Mock `@atproto/api` module's BskyAgent
- Create mock implementations of:
  - `agent.login()`
  - `agent.post()`
  - `agent.api.app.bsky.actor.profile()` (for pinning)
- Use spies to verify method calls
- Return controlled responses

**Example mock structure:**
```typescript
vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn(() => ({
    login: vi.fn(),
    post: vi.fn(),
    api: {
      app: {
        bsky: {
          actor: {
            profile: vi.fn()
          }
        }
      }
    }
  }))
}));
```

**Key assertions:**
- Verify method calls with correct parameters
- Verify return values
- Verify error propagation

## Test Utilities

### fixtures.ts

Shared test data and factory functions:

```typescript
// Sample venues
export const mockVenues = {
  madrid: { name: 'Sala But', city: 'Madrid' },
  barcelona: { name: 'Razzmatazz', city: 'Barcelona' }
};

// Sample concerts
export function createMockConcert(overrides?: Partial<Concert>): Concert {
  return {
    id: 'test-id-123',
    venue: mockVenues.madrid,
    date: new Date('2026-03-15T20:00:00'),
    announcementDate: new Date('2026-03-10T12:00:00'),
    cancellationDate: new Date('2026-03-14T22:00:00'),
    isPinned: false,
    isCanceled: false,
    ...overrides
  };
}

// Sample state
export function createMockState(overrides?: Partial<State>): State {
  return {
    concerts: [],
    ...overrides
  };
}
```

### helpers.ts

Test utility functions:

```typescript
// Time mocking
export function setMockTime(date: Date) {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

export function resetMockTime() {
  vi.useRealTimers();
}

// Mock Math.random with sequence
export function mockRandomSequence(values: number[]) {
  let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

// Create mock Bluesky agent
export function createMockBskyAgent() {
  return {
    login: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ uri: 'at://post/123' }),
    api: {
      app: {
        bsky: {
          actor: {
            profile: vi.fn().mockResolvedValue({ success: true })
          }
        }
      }
    }
  };
}
```

## Mocking Strategies

### Time and Date Mocking

Use Vitest's built-in timer mocking:

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('Monday 10:00-14:00 window', () => {
  // Set to Monday at 12:00
  vi.setSystemTime(new Date('2026-03-09T12:00:00'));

  const result = shouldPostWeeklyAnnouncement(state);
  expect(result).toBe(true);
});
```

### Randomness Mocking

Control Math.random() for deterministic tests:

```typescript
test('generates 2 concerts when random returns 0.5', () => {
  vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0.5)  // Concert count: floor(0.5 * 3) + 1 = 2
    .mockReturnValueOnce(0.6)  // Day selection
    .mockReturnValueOnce(0.3)  // Time slot
    // ... more values as needed

  const concerts = generateWeeklyConcerts();
  expect(concerts).toHaveLength(2);
});
```

### File System Mocking

Mock fs/promises for storage tests:

```typescript
import { vi } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

import { readFile, writeFile } from 'fs/promises';

test('saves state to file', async () => {
  await saveState(state);

  expect(writeFile).toHaveBeenCalledWith(
    expect.stringContaining('concerts.json'),
    expect.any(String)
  );
});
```

### Bluesky API Mocking

Mock the @atproto/api module:

```typescript
import { vi } from 'vitest';

const mockAgent = {
  login: vi.fn().mockResolvedValue({ success: true }),
  post: vi.fn().mockResolvedValue({ uri: 'at://post/123' })
};

vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn(() => mockAgent)
}));
```

## Test Isolation

### BeforeEach / AfterEach

Each test file uses hooks for setup/teardown:

```typescript
describe('Module name', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset timers if used
    vi.useRealTimers();
  });

  afterEach(() => {
    // Additional cleanup if needed
    vi.restoreAllMocks();
  });
});
```

### Independent Tests

Each test:
- Runs independently
- Has its own mocks and fixtures
- Doesn't depend on other tests
- Cleans up after itself

## TypeScript Configuration

Update `tsconfig.json` to exclude test files from build:

```json
{
  "compilerOptions": {
    // ... existing options
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts", "src/__tests__"]
}
```

## Error Testing

Each module includes error case testing:

- **concertGenerator:** Invalid date ranges, max attempts exceeded
- **scheduler:** Null/undefined state values, missing dates
- **venues:** Empty venue list (if applicable)
- **storage:** File not found, corrupted JSON, write failures
- **blueskyClient:** Network errors, authentication failures, API errors

Example:

```typescript
test('handles file not found error', async () => {
  vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

  await expect(loadState()).rejects.toThrow('ENOENT');
});
```

## Performance Considerations

- No actual network calls (all mocked)
- No actual file I/O (all mocked)
- Fast execution: entire suite should run in < 1 second
- Parallel execution enabled by default in Vitest
- Use `vitest run` for CI/CD (exits after running)

## CI/CD Integration

For continuous integration:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test
```

The `npm test` command runs `vitest run`, which:
- Runs all tests once
- Exits with code 0 (success) or 1 (failure)
- Outputs results to console

## Implementation Checklist

1. Install dependencies (`vitest`, `@vitest/ui`)
2. Create `vitest.config.ts`
3. Update `package.json` scripts
4. Update `tsconfig.json` exclude
5. Create `src/__tests__/` directory
6. Implement `fixtures.ts` with test data
7. Implement `helpers.ts` with utilities
8. Write `concertGenerator.test.ts`
9. Write `scheduler.test.ts`
10. Write `venues.test.ts`
11. Write `storage.test.ts`
12. Write `blueskyClient.test.ts`
13. Verify all tests pass
14. Document test commands in README

## Success Criteria

- All modules have comprehensive unit tests
- Tests run in < 1 second total
- All tests pass
- No external dependencies during test execution
- TypeScript compilation excludes test files
- Three npm commands work: `test`, `test:watch`, `test:ui`
- Tests are maintainable and well-organized

## Future Enhancements (Out of Scope)

- Code coverage reporting (can be added later with `--coverage` flag)
- Integration tests with real Bluesky account
- E2E tests for the full bot lifecycle
- Performance benchmarking
- Snapshot testing for generated messages
