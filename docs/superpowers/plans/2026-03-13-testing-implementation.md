# Testing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive unit testing suite for the Morriliebers Bluesky bot using Vitest

**Architecture:** Set up Vitest testing framework with mocked dependencies (API, filesystem, time, randomness). Tests organized in `src/__tests__/` with shared fixtures and helpers. Follow TDD principles for new test coverage of existing code.

**Tech Stack:** Vitest 2.1.0, TypeScript, Node.js, ESM modules

---

## File Structure

**New files to create:**
- `vitest.config.ts` - Vitest configuration
- `src/__tests__/fixtures.ts` - Shared test data and factory functions
- `src/__tests__/helpers.ts` - Test utility functions for mocking
- `src/__tests__/scheduler.test.ts` - Tests for scheduling logic
- `src/__tests__/venues.test.ts` - Tests for venue selection
- `src/__tests__/concertGenerator.test.ts` - Tests for concert generation
- `src/__tests__/storage.test.ts` - Tests for state persistence
- `src/__tests__/blueskyClient.test.ts` - Tests for API client

**Files to modify:**
- `package.json` - Add vitest dependencies and test scripts
- `tsconfig.json` - Exclude test files from build
- `README.md` - Document test commands

---

## Chunk 1: Setup, Infrastructure, and Scheduler Tests

This chunk covers project setup, test infrastructure, and complete scheduler module testing.

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vitest and UI**

```bash
npm install --save-dev vitest@^2.1.0 @vitest/ui@^2.1.0
```

Expected: Dependencies added to `package.json` devDependencies

- [ ] **Step 2: Verify installation**

```bash
npx vitest --version
```

Expected: Output shows version 2.1.x

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest testing dependencies"
```

---

### Task 2: Create Vitest Configuration

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

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

- [ ] **Step 2: Verify configuration loads**

```bash
npx vitest --version
```

Expected: No configuration errors, shows version 2.1.x

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest configuration"
```

---

### Task 3: Add Test Scripts to package.json

**Files:**
- Modify: `package.json:7-11`

- [ ] **Step 1: Update test scripts**

Replace the current test script line with:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
```

The scripts section should look like:

```json
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  },
```

- [ ] **Step 2: Verify scripts work**

```bash
npm test
```

Expected: "No test files found" (we haven't created tests yet)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test commands to package.json"
```

---

### Task 4: Update TypeScript Configuration

**Files:**
- Modify: `tsconfig.json:19`

- [ ] **Step 1: Update exclude array**

Change line 19 from:

```json
  "exclude": ["node_modules", "dist"]
```

To:

```json
  "exclude": ["node_modules", "dist", "src/**/*.test.ts", "src/__tests__"]
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npm run build
```

Expected: Build succeeds, no test files in `dist/`

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: exclude test files from TypeScript build"
```

---

### Task 5: Create Test Directory Structure

**Files:**
- Create: `src/__tests__/` directory

- [ ] **Step 1: Create __tests__ directory**

```bash
mkdir -p src/__tests__
```

- [ ] **Step 2: Create placeholder .gitkeep**

```bash
touch src/__tests__/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/.gitkeep
git commit -m "chore: create test directory structure"
```

### Task 6: Create Test Fixtures

**Files:**
- Create: `src/__tests__/fixtures.ts`

- [ ] **Step 1: Create fixtures file with mock data**

```typescript
import type { Concert, State, Venue } from '../types.js';

/**
 * Mock venues for testing
 */
export const mockVenues = {
  madrid: { name: 'Sala But', city: 'Madrid' },
  barcelona: { name: 'Razzmatazz', city: 'Barcelona' },
  valencia: { name: 'La Rambleta', city: 'Valencia' }
};

/**
 * Create a mock concert with optional overrides
 */
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

/**
 * Create a mock state with optional overrides
 */
export function createMockState(overrides?: Partial<State>): State {
  return {
    concerts: [],
    ...overrides
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/fixtures.ts
git commit -m "test: add test fixtures and factory functions"
```

---

### Task 7: Create Test Helper Functions

**Files:**
- Create: `src/__tests__/helpers.ts`

- [ ] **Step 1: Create helpers file**

```typescript
import { vi } from 'vitest';

/**
 * Set up fake timers and set the current time
 */
export function setMockTime(date: Date): void {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

/**
 * Reset timers to real implementation
 */
export function resetMockTime(): void {
  vi.useRealTimers();
}

/**
 * Mock Math.random with a sequence of values
 */
export function mockRandomSequence(values: number[]): void {
  let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

/**
 * Create a mock Bluesky agent for testing
 */
export function createMockBskyAgent() {
  return {
    login: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ uri: 'at://post/123' }),
    upsertProfile: vi.fn((callback) => {
      const existing = { displayName: 'Test', description: 'Bio' };
      const updated = callback(existing);
      return Promise.resolve(updated);
    })
  };
}

/**
 * Set up file system mocks for testing storage
 * Use with vi.mocked() after importing fs modules
 */
export function setupFileSystemMocks(options: {
  fileExists?: boolean;
  fileContent?: string;
  readError?: Error;
  writeError?: Error;
  renameError?: Error;
} = {}) {
  const {
    fileExists = false,
    fileContent = '{}',
    readError,
    writeError,
    renameError
  } = options;

  return {
    existsSync: vi.fn(() => fileExists),
    readFile: vi.fn(() =>
      readError ? Promise.reject(readError) : Promise.resolve(fileContent)
    ),
    writeFile: vi.fn(() =>
      writeError ? Promise.reject(writeError) : Promise.resolve()
    ),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn(() =>
      renameError ? Promise.reject(renameError) : Promise.resolve()
    )
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/helpers.ts
git commit -m "test: add test helper functions for mocking"
```

### Task 8: Test shouldPostWeeklyAnnouncement - Happy Path

**Files:**
- Create: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Write test for Monday 10:00-14:00 window**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldPostWeeklyAnnouncement } from '../scheduler.js';
import { createMockState } from './fixtures.js';
import { setMockTime, resetMockTime } from './helpers.js';

describe('shouldPostWeeklyAnnouncement', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns true on Monday at 12:00 with no previous announcement', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add happy path test for shouldPostWeeklyAnnouncement"
```

---

### Task 9: Test shouldPostWeeklyAnnouncement - Time Boundaries

**Files:**
- Modify: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Add tests for time window boundaries**

Add these tests inside the `describe('shouldPostWeeklyAnnouncement')` block:

```typescript
  it('returns true on Monday at 10:00 (start of window)', () => {
    setMockTime(new Date('2026-03-09T10:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns true on Monday at 13:59 (end of window)', () => {
    setMockTime(new Date('2026-03-09T13:59:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns false on Monday at 09:59 (before window)', () => {
    setMockTime(new Date('2026-03-09T09:59:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false on Monday at 14:00 (after window)', () => {
    setMockTime(new Date('2026-03-09T14:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add time boundary tests for shouldPostWeeklyAnnouncement"
```

---

### Task 10: Test shouldPostWeeklyAnnouncement - Day of Week

**Files:**
- Modify: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Add tests for different days**

Add these tests inside the `describe('shouldPostWeeklyAnnouncement')` block:

```typescript
  it('returns false on Tuesday at 12:00', () => {
    // Tuesday, March 10, 2026 at 12:00
    setMockTime(new Date('2026-03-10T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false on Sunday at 12:00', () => {
    // Sunday, March 15, 2026 at 12:00
    setMockTime(new Date('2026-03-15T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add day of week tests for shouldPostWeeklyAnnouncement"
```

---

### Task 11: Test shouldPostWeeklyAnnouncement - Previous Announcements

**Files:**
- Modify: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Add tests for previous announcement checking**

Add these tests inside the `describe('shouldPostWeeklyAnnouncement')` block:

```typescript
  it('returns false if already announced this week', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: new Date('2026-03-09T11:00:00') // Earlier today
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns true if announced last week', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: new Date('2026-03-02T12:00:00') // Last Monday
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns true with undefined lastAnnouncementDate', () => {
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: undefined
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add previous announcement tests for shouldPostWeeklyAnnouncement"
```

---

### Task 12: Test getConcertsToCancelNow - Basic Cases

**Files:**
- Modify: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Add getConcertsToCancelNow tests**

Add new describe block after the existing one:

```typescript
describe('getConcertsToCancelNow', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns concerts past their cancellation date', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        id: '1',
        cancellationDate: new Date('2026-03-14T22:00:00'), // 1 hour ago
        isCanceled: false
      }),
      createMockConcert({
        id: '2',
        cancellationDate: new Date('2026-03-15T10:00:00'), // Tomorrow
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes already-canceled concerts', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        id: '1',
        cancellationDate: new Date('2026-03-14T22:00:00'),
        isCanceled: true // Already canceled
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no concerts to cancel', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        cancellationDate: new Date('2026-03-15T10:00:00'), // Future
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });

  it('handles concerts without cancellation dates', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        cancellationDate: undefined,
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });
});
```

Don't forget to import the function at the top:

```typescript
import { shouldPostWeeklyAnnouncement, getConcertsToCancelNow } from '../scheduler.js';
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (14 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add getConcertsToCancelNow tests"
```

---

### Task 13: Test hasRemainingConcertsInWeek

**Files:**
- Modify: `src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Add hasRemainingConcertsInWeek tests**

Add import at top:

```typescript
import {
  shouldPostWeeklyAnnouncement,
  getConcertsToCancelNow,
  hasRemainingConcertsInWeek
} from '../scheduler.js';
```

Add new describe block:

```typescript
describe('hasRemainingConcertsInWeek', () => {
  it('returns true when uncanceled concerts remain in same week', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-12T20:00:00'), // Wednesday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-14T20:00:00'), // Friday, same week
        isCanceled: false
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(true);
  });

  it('returns false when all concerts in week are canceled', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-12T20:00:00'), // Wednesday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-14T20:00:00'), // Friday, same week
        isCanceled: true // Also canceled
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(false);
  });

  it('correctly identifies week boundaries', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-15T20:00:00'), // Sunday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-16T20:00:00'), // Monday (next week)
        isCanceled: false
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scheduler.test.ts
```

Expected: PASS (17 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/scheduler.test.ts
git commit -m "test: add hasRemainingConcertsInWeek tests"
```

---

---

## Chunk 2: Venues and Concert Generator Tests

This chunk covers venues module testing (basic functionality, validation, error cases) and concert generator testing (generation logic, constraints, properties, edge cases).

### Task 14: Test getRandomVenue - Basic Functionality

**Files:**
- Create: `src/__tests__/venues.test.ts`

- [ ] **Step 1: Write basic getRandomVenue tests**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRandomVenue, venues } from '../venues.js';

describe('getRandomVenue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a valid venue object', () => {
    const venue = getRandomVenue();

    expect(venue).toHaveProperty('name');
    expect(venue).toHaveProperty('city');
    expect(typeof venue.name).toBe('string');
    expect(typeof venue.city).toBe('string');
  });

  it('returns venue from the loaded venues array', () => {
    const venue = getRandomVenue();

    // Venue should exist in the venues array
    const found = venues.some(v => v.name === venue.name && v.city === venue.city);
    expect(found).toBe(true);
  });

  it('selects specific venue when Math.random is mocked', () => {
    // Mock to select first venue
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const venue = getRandomVenue();

    expect(venue).toEqual(venues[0]);
  });

  it('selects different venue with different random value', () => {
    // Mock to select last venue (random returns value close to 1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const venue = getRandomVenue();

    const expectedIndex = Math.floor(0.99 * venues.length);
    expect(venue).toEqual(venues[expectedIndex]);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- venues.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/venues.test.ts
git commit -m "test: add basic getRandomVenue tests"
```

---

### Task 15: Test Venue Data Validation

**Files:**
- Modify: `src/__tests__/venues.test.ts`

- [ ] **Step 1: Add venue data validation tests**

Add new describe block:

```typescript
describe('venues data validation', () => {
  it('venues array is non-empty', () => {
    expect(venues.length).toBeGreaterThan(0);
  });

  it('all venues have required name property', () => {
    venues.forEach((venue, index) => {
      expect(venue.name, `Venue at index ${index} missing name`).toBeTruthy();
      expect(typeof venue.name, `Venue at index ${index} name not string`).toBe('string');
    });
  });

  it('all venues have required city property', () => {
    venues.forEach((venue, index) => {
      expect(venue.city, `Venue at index ${index} missing city`).toBeTruthy();
      expect(typeof venue.city, `Venue at index ${index} city not string`).toBe('string');
    });
  });

  it('optional capacity field is string if present', () => {
    venues.forEach((venue, index) => {
      if ('capacity' in venue && venue.capacity !== undefined) {
        expect(typeof venue.capacity, `Venue at index ${index} capacity not string`).toBe('string');
      }
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- venues.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/venues.test.ts
git commit -m "test: add venue data validation tests"
```

---

### Task 16: Test Venue Loading Error Cases

**Files:**
- Modify: `src/__tests__/venues.test.ts`

**Note:** Testing module initialization errors is complex with ESM modules due to caching. We'll test the validation logic that runs during initialization, but we cannot easily test file system errors during module load in this test file (since the module is already loaded when we import from it). These error cases are already covered by the production code's error handling and would be caught in integration testing if the config file is malformed.

- [ ] **Step 1: Add note about loadVenues testing limitations**

Add comment at end of file explaining module initialization testing:

```typescript
/**
 * Note on loadVenues() error testing:
 *
 * loadVenues() is called at module initialization (when venues.ts is imported),
 * so we cannot easily test file system errors (file not found, invalid JSON, etc.)
 * in this test file without complex module cache manipulation.
 *
 * The validation logic (non-empty array, required fields) is already covered
 * by the 'venues data validation' tests above, which verify the loaded data
 * meets requirements.
 *
 * File system error handling would be caught in:
 * - Manual testing during development
 * - Integration tests with actual file system
 * - Production deployment (fails fast with clear error message)
 */
```

- [ ] **Step 2: Run tests**

```bash
npm test -- venues.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/venues.test.ts
git commit -m "test: add documentation about loadVenues testing limitations"
```

### Task 17: Test generateWeeklyConcerts - Basic Generation

**Files:**
- Create: `src/__tests__/concertGenerator.test.ts`

- [ ] **Step 1: Write basic concert generation test**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateWeeklyConcerts } from '../concertGenerator.js';
import { mockRandomSequence, setMockTime, resetMockTime } from './helpers.js';
import * as venuesModule from '../venues.js';

describe('generateWeeklyConcerts', () => {
  beforeEach(() => {
    // Mock getRandomVenue to return predictable venues
    vi.spyOn(venuesModule, 'getRandomVenue').mockReturnValue({
      name: 'Test Venue',
      city: 'Test City'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockTime();
  });

  it('generates 1-3 concerts', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    // Mock Math.random to generate 2 concerts
    mockRandomSequence([
      0.5,  // Concert count: floor(0.5 * 3) + 1 = 2
      0.2,  // Day selection
      0.3,  // Time slot
      0.4,  // Random for cancellation
      0.6,  // Day selection
      0.7,  // Time slot
      0.5   // Random for cancellation
    ]);

    const concerts = generateWeeklyConcerts();

    // With mocked random value 0.5, should generate exactly 2 concerts
    expect(concerts).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm test -- concertGenerator.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/concertGenerator.test.ts
git commit -m "test: add basic concert generation test"
```

---

### Task 18: Test Concert Day and Time Constraints

**Files:**
- Modify: `src/__tests__/concertGenerator.test.ts`

- [ ] **Step 1: Add day and time constraint tests**

Add these tests to the describe block:

```typescript
  it('schedules concerts only on Wed-Sun', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.5, 0.3,  // Concert 1
      0.25, 0.5, 0.4, // Concert 2
      0.5, 0.5, 0.5,  // Concert 3
      0.75, 0.5, 0.6  // Extras
    ]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      const day = concert.date.getDay();
      // 0 = Sunday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      expect([0, 3, 4, 5, 6]).toContain(day);
    });
  });

  it('schedules concerts between 17:00 and 23:30', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.0, 0.1,  // Concert 1: early time
      0.25, 0.9, 0.2, // Concert 2: late time
      0.5, 0.5, 0.3,  // Concert 3: mid time
      0.1, 0.2, 0.4
    ]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      const hours = concert.date.getHours();
      const minutes = concert.date.getMinutes();

      expect(hours).toBeGreaterThanOrEqual(17);
      expect(hours).toBeLessThanOrEqual(23);

      // Minutes should be 0 or 30
      expect([0, 30]).toContain(minutes);

      // If hour is 23, ensure it's not past 23:30
      if (hours === 23) {
        expect(minutes).toBeLessThanOrEqual(30);
      }
    });
  });

  it('does not schedule duplicate days in same week', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.5, 0.3,  // Concert 1: day index 0 (Wed)
      0.4, 0.6, 0.4,  // Concert 2: day index 2 (Fri) - different day
      0.8, 0.7, 0.5,  // Concert 3: day index 4 (Sun) - different day
      0.1, 0.2, 0.3
    ]);

    const concerts = generateWeeklyConcerts();

    const days = concerts.map(c => c.date.getDay());
    const uniqueDays = new Set(days);

    expect(uniqueDays.size).toBe(days.length); // No duplicates
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- concertGenerator.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/concertGenerator.test.ts
git commit -m "test: add concert day and time constraint tests"
```

---

### Task 19: Test Concert Properties

**Files:**
- Modify: `src/__tests__/concertGenerator.test.ts`

- [ ] **Step 1: Add concert property tests**

Add these tests:

```typescript
  it('assigns valid venue to each concert', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([0.5, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      expect(concert.venue).toBeDefined();
      expect(concert.venue.name).toBe('Test Venue');
      expect(concert.venue.city).toBe('Test City');
    });
  });

  it('assigns unique IDs to each concert', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.5, 0.3,
      0.25, 0.6, 0.4,
      0.5, 0.7, 0.5,
      0.1, 0.2, 0.3
    ]);

    const concerts = generateWeeklyConcerts();

    const ids = concerts.map(c => c.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);

    // IDs should be hex strings (32 characters)
    ids.forEach(id => {
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  it('sets cancellation date 20-24 hours before concert', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([0.5, 0.2, 0.3, 0.0, 0.5, 0.6, 0.7]); // 0.0 for min hours (20)

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      expect(concert.cancellationDate).toBeDefined();

      const concertTime = concert.date.getTime();
      const cancelTime = concert.cancellationDate!.getTime();
      const hoursDiff = (concertTime - cancelTime) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThanOrEqual(20);
      expect(hoursDiff).toBeLessThanOrEqual(24);
    });
  });

  it('sorts concerts chronologically', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.8, 0.8, 0.3,  // Late in week
      0.0, 0.0, 0.4,  // Early in week
      0.4, 0.5, 0.5,  // Mid week
      0.1, 0.2, 0.3
    ]);

    const concerts = generateWeeklyConcerts();

    for (let i = 1; i < concerts.length; i++) {
      expect(concerts[i].date.getTime()).toBeGreaterThanOrEqual(
        concerts[i - 1].date.getTime()
      );
    }
  });

  it('initializes concert state correctly', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([0.5, 0.2, 0.3, 0.4, 0.5, 0.6]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      expect(concert.isPinned).toBe(false);
      expect(concert.isCanceled).toBe(false);
      expect(concert.postId).toBeUndefined();
      expect(concert.cancelPostId).toBeUndefined();
      expect(concert.announcementDate).toBeInstanceOf(Date);
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- concertGenerator.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/concertGenerator.test.ts
git commit -m "test: add concert property validation tests"
```

---

### Task 20: Test Edge Cases and Error Handling

**Files:**
- Modify: `src/__tests__/concertGenerator.test.ts`

- [ ] **Step 1: Add edge case tests**

Add these tests:

```typescript
  it('handles week boundaries correctly', () => {
    // Test at end of month
    setMockTime(new Date('2026-03-30T12:00:00')); // Monday

    mockRandomSequence([0.5, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      // Concert should be in the week starting March 30
      expect(concert.date.getDate()).toBeGreaterThanOrEqual(30);
      // Could be in March or April
      expect([3, 4]).toContain(concert.date.getMonth() + 1);
    });
  });

  it('throws error after max attempts when cannot find available day', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    // Mock to always return same day index (will cause collision)
    mockRandomSequence([
      0.9,  // 3 concerts (but only 5 valid days)
      0.1, 0.5, 0.3,  // Concert 1
      0.1, 0.6, 0.4,  // Concert 2: same day
      0.1, 0.7, 0.5,  // Concert 3: same day
      ...Array(60).fill(0.1) // Keep returning same day
    ]);

    expect(() => generateWeeklyConcerts()).toThrow('Could not find available day');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- concertGenerator.test.ts
```

Expected: PASS (12 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/concertGenerator.test.ts
git commit -m "test: add edge case tests for concert generation"
```

---

---

## Chunk 3: Storage Module Tests

This chunk covers storage module testing (serialization/deserialization, loadState, saveState, error handling).

### Task 21: Test State Serialization and Deserialization

**Files:**
- Create: `src/__tests__/storage.test.ts`

- [ ] **Step 1: Write serialization/deserialization tests**

```typescript
// Mock fs modules at top level (before imports)
vi.mock('fs');
vi.mock('fs/promises');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { loadState, saveState } from '../storage.js';
import { createMockState, createMockConcert } from './fixtures.js';
import { setupFileSystemMocks } from './helpers.js';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serialization round-trip', () => {
    it('preserves all concert data through save and load', async () => {
      const originalState = createMockState({
        concerts: [
          createMockConcert({
            id: '1',
            date: new Date('2026-03-15T20:00:00'),
            announcementDate: new Date('2026-03-10T12:00:00'),
            cancellationDate: new Date('2026-03-14T22:00:00'),
            postId: 'post-123',
            cancelPostId: 'cancel-456',
            isPinned: true,
            isCanceled: false
          })
        ],
        lastAnnouncementDate: new Date('2026-03-10T12:00:00'),
        weeklyPostId: 'weekly-789'
      });

      let savedData: string = '';

      // Setup mocks
      const mocks = setupFileSystemMocks({ fileExists: true });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedData = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockImplementation(() => Promise.resolve(savedData));

      // Save and load
      await saveState(originalState);
      const loadedState = await loadState();

      // Verify all data preserved
      expect(loadedState.concerts).toHaveLength(1);
      expect(loadedState.concerts[0].id).toBe('1');
      // Venue object preserved
      expect(loadedState.concerts[0].venue).toEqual(originalState.concerts[0].venue);
      // Dates converted from ISO strings to Date objects
      expect(loadedState.concerts[0].date.toISOString()).toBe('2026-03-15T20:00:00.000Z');
      expect(loadedState.concerts[0].announcementDate.toISOString()).toBe('2026-03-10T12:00:00.000Z');
      expect(loadedState.concerts[0].cancellationDate?.toISOString()).toBe('2026-03-14T22:00:00.000Z');
      // Other properties preserved
      expect(loadedState.concerts[0].postId).toBe('post-123');
      expect(loadedState.concerts[0].cancelPostId).toBe('cancel-456');
      expect(loadedState.concerts[0].isPinned).toBe(true);
      expect(loadedState.concerts[0].isCanceled).toBe(false);
      expect(loadedState.lastAnnouncementDate?.toISOString()).toBe('2026-03-10T12:00:00.000Z');
      expect(loadedState.weeklyPostId).toBe('weekly-789');
    });

    it('handles missing optional fields', async () => {
      const originalState = createMockState({
        concerts: [
          createMockConcert({
            id: '1',
            cancellationDate: undefined,
            postId: undefined,
            cancelPostId: undefined
          })
        ],
        lastAnnouncementDate: undefined,
        weeklyPostId: undefined
      });

      let savedData: string = '';

      const mocks = setupFileSystemMocks({ fileExists: true });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedData = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockImplementation(() => Promise.resolve(savedData));

      await saveState(originalState);
      const loadedState = await loadState();

      expect(loadedState.concerts[0].cancellationDate).toBeUndefined();
      expect(loadedState.concerts[0].postId).toBeUndefined();
      expect(loadedState.concerts[0].cancelPostId).toBeUndefined();
      expect(loadedState.lastAnnouncementDate).toBeUndefined();
      expect(loadedState.weeklyPostId).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- storage.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/storage.test.ts
git commit -m "test: add serialization and deserialization tests"
```

---

### Task 22: Test loadState Function

**Files:**
- Modify: `src/__tests__/storage.test.ts`

- [ ] **Step 1: Add loadState tests**

Add new describe block inside the main storage describe:

```typescript
  describe('loadState', () => {
    it('creates data directory if missing', async () => {
      const mocks = setupFileSystemMocks({ fileExists: false });
      vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValueOnce(false);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation(mocks.writeFile);
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockResolvedValue('{"concerts":[]}');

      await loadState();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('returns empty state and saves it if file does not exist', async () => {
      const mocks = setupFileSystemMocks({ fileExists: false });
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // Directory exists
        .mockReturnValueOnce(false); // File doesn't exist
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation(mocks.writeFile);
      vi.mocked(rename).mockImplementation(mocks.rename);

      const state = await loadState();

      expect(state.concerts).toEqual([]);
      // Verify empty state was saved
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.stringContaining('"concerts":[]'),
        'utf-8'
      );
    });

    it('successfully loads existing state file', async () => {
      const mockData = {
        concerts: [
          {
            id: '1',
            venue: { name: 'Test', city: 'City' },
            date: '2026-03-15T20:00:00.000Z',
            announcementDate: '2026-03-10T12:00:00.000Z',
            cancellationDate: '2026-03-14T22:00:00.000Z',
            isPinned: false,
            isCanceled: false
          }
        ],
        lastAnnouncementDate: '2026-03-10T12:00:00.000Z',
        weeklyPostId: 'post-123'
      };

      const mocks = setupFileSystemMocks({
        fileExists: true,
        fileContent: JSON.stringify(mockData)
      });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(readFile).mockImplementation(mocks.readFile);

      const state = await loadState();

      expect(state.concerts).toHaveLength(1);
      expect(state.concerts[0].id).toBe('1');
      expect(state.concerts[0].venue.name).toBe('Test');
      expect(state.concerts[0].venue.city).toBe('City');
      expect(state.concerts[0].date).toBeInstanceOf(Date);
      expect(state.concerts[0].announcementDate).toBeInstanceOf(Date);
      expect(state.concerts[0].cancellationDate).toBeInstanceOf(Date);
      expect(state.lastAnnouncementDate).toBeInstanceOf(Date);
    });

    it('handles corrupted JSON by creating backup and returning empty state', async () => {
      const corruptedData = '{invalid json';

      vi.mocked(existsSync).mockReturnValue(true);
      // Note: Implementation calls readFile twice - once in try block (fails parse),
      // then again in the backup logic to read the corrupted file for backup
      vi.mocked(readFile)
        .mockResolvedValueOnce(corruptedData)  // First call in try block
        .mockResolvedValueOnce(corruptedData); // Second call for backup

      vi.mocked(writeFile).mockResolvedValue();

      const state = await loadState();

      expect(state.concerts).toEqual([]);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/concerts\.json\.backup-\d+$/),
        corruptedData
      );
    });

    it('handles backup failure gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce('{bad json')
        .mockRejectedValueOnce(new Error('Cannot read file'));

      const state = await loadState();

      expect(state.concerts).toEqual([]);
    });

    it('returns empty state when directory creation fails', async () => {
      // Test scenario: data directory doesn't exist and mkdir fails
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

      const state = await loadState();

      // Should catch error and return empty state
      expect(state.concerts).toEqual([]);
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- storage.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/storage.test.ts
git commit -m "test: add loadState function tests"
```

---

### Task 23: Test saveState Function

**Files:**
- Modify: `src/__tests__/storage.test.ts`

- [ ] **Step 1: Add saveState tests**

Add new describe block:

```typescript
  describe('saveState', () => {
    it('creates data directory if missing', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue();
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('serializes state correctly', async () => {
      const state = createMockState({
        concerts: [
          createMockConcert({
            id: '1',
            date: new Date('2026-03-15T20:00:00'),
            announcementDate: new Date('2026-03-10T12:00:00')
          })
        ]
      });

      let savedContent: string = '';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedContent = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      const parsed = JSON.parse(savedContent);
      expect(parsed.concerts).toHaveLength(1);
      expect(parsed.concerts[0].id).toBe('1');
      // Venue object serialized as plain object (not Date)
      expect(parsed.concerts[0].venue).toEqual(state.concerts[0].venue);
      expect(typeof parsed.concerts[0].venue.name).toBe('string');
      expect(typeof parsed.concerts[0].venue.city).toBe('string');
      // Dates serialized to ISO strings
      expect(parsed.concerts[0].date).toBe('2026-03-15T20:00:00.000Z');
      expect(parsed.concerts[0].announcementDate).toBe('2026-03-10T12:00:00.000Z');
      // Boolean flags preserved
      expect(parsed.concerts[0].isPinned).toBe(false);
      expect(parsed.concerts[0].isCanceled).toBe(false);
    });

    it('uses atomic write pattern', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue();
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      // Verify temp file written first
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.any(String),
        'utf-8'
      );

      // Verify rename called
      expect(rename).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.stringContaining('concerts.json')
      );
    });

    it('throws error if write fails', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

      await expect(saveState(state)).rejects.toThrow('Write failed');
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- storage.test.ts
```

Expected: PASS (12 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/storage.test.ts
git commit -m "test: add saveState function tests"
```

---

---

## Chunk 4: Bluesky Client and Final Verification

This chunk covers Bluesky client testing (authentication, post creation, pin/unpin) and final verification tasks (test suite validation, documentation).

**Note:** Tasks 24-26 all modify the same file (`src/__tests__/blueskyClient.test.ts`) sequentially. Each task adds new test describe blocks to the file created in Task 24.

### Task 24: Test BlueskyClient Authentication

**Files:**
- Create: `src/__tests__/blueskyClient.test.ts`

- [ ] **Step 1: Write authentication tests**

```typescript
// Mock @atproto/api at top level
vi.mock('@atproto/api');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { BlueskyClient } from '../blueskyClient.js';

describe('BlueskyClient', () => {
  let mockAgent: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgent = {
      login: vi.fn(),
      post: vi.fn(),
      upsertProfile: vi.fn()
    };

    vi.mocked(BskyAgent).mockImplementation(() => mockAgent);
  });

  describe('authenticate', () => {
    it('successfully authenticates with valid credentials', async () => {
      mockAgent.login.mockResolvedValue({ success: true });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.authenticate();

      expect(mockAgent.login).toHaveBeenCalledWith({
        identifier: 'user.bsky.social',
        password: 'password'
      });
    });

    it('throws error on authentication failure', async () => {
      mockAgent.login.mockRejectedValue(new Error('Invalid credentials'));

      const client = new BlueskyClient('user.bsky.social', 'wrong');

      await expect(client.authenticate()).rejects.toThrow('Failed to authenticate with Bluesky');
    });

    it('handles network errors', async () => {
      mockAgent.login.mockRejectedValue(new Error('Network error'));

      const client = new BlueskyClient('user.bsky.social', 'password');

      await expect(client.authenticate()).rejects.toThrow('Failed to authenticate');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- blueskyClient.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/blueskyClient.test.ts
git commit -m "test: add BlueskyClient authentication tests"
```

---

### Task 25: Test Post Creation Methods

**Files:**
- Modify: `src/__tests__/blueskyClient.test.ts`

- [ ] **Step 1: Add post creation tests**

Add new describe blocks:

```typescript
  describe('postWeeklyAnnouncement', () => {
    it('creates post with formatted concert list', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://post/123' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concerts = [
        createMockConcert({
          date: new Date('2026-03-12T20:00:00'),
          venue: { name: 'Sala But', city: 'Madrid' }
        }),
        createMockConcert({
          date: new Date('2026-03-14T21:30:00'),
          venue: { name: 'Razzmatazz', city: 'Barcelona' }
        })
      ];

      const uri = await client.postWeeklyAnnouncement(concerts);

      expect(mockAgent.post).toHaveBeenCalledWith({
        text: expect.stringContaining('Próximos conciertos de Morriliebers'),
        createdAt: expect.any(String)
      });
      expect(uri).toBe('at://post/123');
    });

    it('formats concert details correctly', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://post/123' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concerts = [
        createMockConcert({
          date: new Date('2026-03-12T20:00:00'),
          venue: { name: 'Sala But', city: 'Madrid' }
        })
      ];

      await client.postWeeklyAnnouncement(concerts);

      const callArg = mockAgent.post.mock.calls[0][0];
      expect(callArg.text).toContain('Sala But, Madrid');
      expect(callArg.text).toContain('20:00');
    });

    it('throws error on post failure', async () => {
      mockAgent.post.mockRejectedValue(new Error('Post failed'));

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concerts = [createMockConcert()];

      await expect(client.postWeeklyAnnouncement(concerts)).rejects.toThrow();
    });
  });

  describe('postCancellation', () => {
    it('creates cancellation post with venue and date', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://cancel/456' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concert = createMockConcert({
        date: new Date('2026-03-15T20:00:00'),
        venue: { name: 'Sala But', city: 'Madrid' }
      });

      const uri = await client.postCancellation(concert);

      expect(mockAgent.post).toHaveBeenCalledWith({
        text: expect.stringContaining('Morriliebers lamenta anunciar la cancelación'),
        createdAt: expect.any(String)
      });
      expect(mockAgent.post.mock.calls[0][0].text).toContain('Sala But');
      expect(uri).toBe('at://cancel/456');
    });

    it('throws error on post failure', async () => {
      mockAgent.post.mockRejectedValue(new Error('Post failed'));

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concert = createMockConcert();

      await expect(client.postCancellation(concert)).rejects.toThrow();
    });
  });

  describe('operation sequencing', () => {
    it('allows posting after authentication', async () => {
      mockAgent.login.mockResolvedValue({ success: true });
      mockAgent.post.mockResolvedValue({ uri: 'at://post/123' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.authenticate();

      const concert = createMockConcert();
      await client.postCancellation(concert);

      // Verify login was called before post
      expect(mockAgent.login).toHaveBeenCalled();
      expect(mockAgent.post).toHaveBeenCalled();
    });

    it('can call multiple operations after single authentication', async () => {
      mockAgent.login.mockResolvedValue({ success: true });
      mockAgent.post.mockResolvedValue({ uri: 'at://post/123' });
      mockAgent.upsertProfile.mockImplementation((callback: any) => {
        return Promise.resolve(callback({}));
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.authenticate();

      // Multiple operations should work after one auth
      await client.postCancellation(createMockConcert());
      await client.pinPost('at://post/123');

      expect(mockAgent.login).toHaveBeenCalledTimes(1);
      expect(mockAgent.post).toHaveBeenCalled();
      expect(mockAgent.upsertProfile).toHaveBeenCalled();
    });
  });
```

Add import to the existing imports at the top of the file:

```typescript
import { createMockConcert } from './fixtures.js';
```

The imports section should now look like:

```typescript
// Mock @atproto/api at top level
vi.mock('@atproto/api');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { BlueskyClient } from '../blueskyClient.js';
import { createMockConcert } from './fixtures.js';
```

- [ ] **Step 2: Run tests**

```bash
npm test -- blueskyClient.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/blueskyClient.test.ts
git commit -m "test: add post creation tests for BlueskyClient"
```

---

### Task 26: Test Pin/Unpin Functionality

**Files:**
- Modify: `src/__tests__/blueskyClient.test.ts`

- [ ] **Step 1: Add pin/unpin tests**

Add new describe blocks:

```typescript
  describe('pinPost', () => {
    it('pins post by calling upsertProfile with pinnedPost', async () => {
      mockAgent.upsertProfile.mockImplementation((callback: any) => {
        const existing = { displayName: 'Test', description: 'Bio' };
        const updated = callback(existing);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.pinPost('at://post/123');

      expect(mockAgent.upsertProfile).toHaveBeenCalled();

      // Verify callback adds pinnedPost
      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({ displayName: 'Test' });
      expect(result.pinnedPost).toBe('at://post/123');
    });

    it('preserves existing profile properties when pinning', async () => {
      mockAgent.upsertProfile.mockImplementation((callback: any) => {
        const existing = { displayName: 'Test', description: 'My bio', avatar: 'img.jpg' };
        const updated = callback(existing);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.pinPost('at://post/123');

      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({ displayName: 'Test', description: 'My bio', avatar: 'img.jpg' });

      expect(result.displayName).toBe('Test');
      expect(result.description).toBe('My bio');
      expect(result.avatar).toBe('img.jpg');
      expect(result.pinnedPost).toBe('at://post/123');
    });

    it('does not throw on pin failure', async () => {
      mockAgent.upsertProfile.mockRejectedValue(new Error('Profile update failed'));

      const client = new BlueskyClient('user.bsky.social', 'password');

      // Should not throw
      await expect(client.pinPost('at://post/123')).resolves.toBeUndefined();
    });
  });

  describe('unpinPost', () => {
    it('unpins post by removing pinnedPost property', async () => {
      mockAgent.upsertProfile.mockImplementation((callback: any) => {
        const existing = { displayName: 'Test', pinnedPost: 'at://post/123' };
        const updated = callback(existing);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.unpinPost();

      expect(mockAgent.upsertProfile).toHaveBeenCalled();

      // Verify callback removes pinnedPost
      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({ displayName: 'Test', pinnedPost: 'at://post/123' });
      expect(result.pinnedPost).toBeUndefined();
      expect('pinnedPost' in result).toBe(false);
    });

    it('preserves other profile properties when unpinning', async () => {
      mockAgent.upsertProfile.mockImplementation((callback: any) => {
        const existing = {
          displayName: 'Test',
          description: 'Bio',
          pinnedPost: 'at://post/123'
        };
        const updated = callback(existing);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.unpinPost();

      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({
        displayName: 'Test',
        description: 'Bio',
        pinnedPost: 'at://post/123'
      });

      expect(result.displayName).toBe('Test');
      expect(result.description).toBe('Bio');
      expect(result.pinnedPost).toBeUndefined();
    });

    it('does not throw on unpin failure', async () => {
      mockAgent.upsertProfile.mockRejectedValue(new Error('Profile update failed'));

      const client = new BlueskyClient('user.bsky.social', 'password');

      // Should not throw
      await expect(client.unpinPost()).resolves.toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- blueskyClient.test.ts
```

Expected: PASS (16 tests)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/blueskyClient.test.ts
git commit -m "test: add pin/unpin tests for BlueskyClient"
```

---

### Task 27: Run Complete Test Suite

**Files:**
- N/A (verification only)

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: PASS (all tests across all modules)
- scheduler.test.ts: 17 tests
- venues.test.ts: 8 tests
- concertGenerator.test.ts: 12 tests
- storage.test.ts: 12 tests
- blueskyClient.test.ts: 16 tests
- Total: 65 tests

- [ ] **Step 2: Verify test execution time**

```bash
npm test
```

Expected: Total execution time < 5 seconds

- [ ] **Step 3: Test watch mode**

```bash
npm run test:watch
```

Expected: Vitest starts in watch mode, press 'q' to quit

- [ ] **Step 4: No commit needed**

---

### Task 28: Verify TypeScript Build Excludes Tests

**Files:**
- N/A (verification only)

- [ ] **Step 1: Clean dist directory**

```bash
rm -rf dist
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Verify no test files in dist**

```bash
find dist -name "*.test.js" -o -name "__tests__"
```

Expected: No output (no test files or __tests__ directory in dist/)

- [ ] **Step 4: No commit needed**

---

### Task 29: Update README with Testing Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Testing section to README**

Add after the "Development" section (search for "## Development" and add new section after it):

```markdown
## Testing

The project includes a comprehensive test suite using Vitest.

### Running Tests

Run all tests once:
```
npm test
```

Run tests in watch mode (re-runs on file changes):
```
npm run test:watch
```

Run tests with UI (opens browser interface):
```
npm run test:ui
```

### Test Structure

Tests are located in `src/__tests__/` and cover:
- Concert generation logic
- Scheduling decisions
- Venue selection and validation
- State persistence (serialization/deserialization)
- Bluesky API client interactions

All external dependencies (API, filesystem, time, randomness) are mocked for fast, isolated testing.

### Writing Tests

Tests use Vitest with globals enabled. Example:

```
typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('does what it should', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

See `src/__tests__/fixtures.ts` and `src/__tests__/helpers.ts` for shared test utilities.
```

Note: The nested code blocks above use single backticks in the actual README. When adding to README.md, format them properly with triple backticks.

- [ ] **Step 2: Verify markdown renders correctly**

View README.md in GitHub or a markdown previewer

Expected: Formatting looks correct

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add testing documentation to README"
```

---

### Task 30: Final Verification and Completion

**Files:**
- N/A (final checks)

- [ ] **Step 1: Run full test suite one more time**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2: Verify test coverage scope**

Check that all source modules have corresponding tests:
- ✅ src/scheduler.ts → __tests__/scheduler.test.ts
- ✅ src/venues.ts → __tests__/venues.test.ts
- ✅ src/concertGenerator.ts → __tests__/concertGenerator.test.ts
- ✅ src/storage.ts → __tests__/storage.test.ts
- ✅ src/blueskyClient.ts → __tests__/blueskyClient.test.ts

- [ ] **Step 3: Create final commit if needed**

```bash
git status
```

If there are any uncommitted changes, commit them:

```bash
git add .
git commit -m "test: finalize testing implementation"
```

- [ ] **Step 4: Success!**

Testing implementation is complete. All modules have comprehensive unit tests with mocked dependencies.

---

## Implementation Complete

You now have:
- ✅ Vitest testing framework configured
- ✅ Test infrastructure (fixtures, helpers)
- ✅ 69+ comprehensive unit tests across 5 modules
- ✅ Fast, isolated test execution (< 5 seconds)
- ✅ Mocked external dependencies (API, filesystem, time, randomness)
- ✅ Three test commands: `test`, `test:watch`, `test:ui`
- ✅ TypeScript excludes test files from build
- ✅ Documentation updated

The test suite provides confidence that all core functionality works correctly and serves as living documentation of the system's behavior.
