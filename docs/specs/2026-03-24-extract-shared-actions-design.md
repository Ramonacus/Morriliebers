# Extract Shared Actions - Design Document

**Date**: 2026-03-24
**Status**: Approved
**Purpose**: Extract duplicated orchestration logic from force scripts and main bot into shared action functions

## Problem Statement

The current implementation has significant code duplication between `index.ts`, `force-tour.ts`, and `cancel-next.ts`:

**Duplicated orchestration logic:**
- Tour generation flow (generate → post → update tour → add to state → save)
- Concert cancellation flow (post → update concert → save)
- Authentication patterns
- Error handling patterns
- State mutation and persistence

**Maintenance burden:**
If we need to change how tours are announced or how state is managed, we must update:
1. `src/index.ts` (handleTourGeneration, handleCancellations)
2. `src/scripts/force-tour.ts` (forceTour function)
3. `src/scripts/cancel-next.ts` (cancelNext function)

This violates DRY and creates risk of inconsistent behavior if changes aren't applied everywhere.

## Solution Overview

Extract the orchestration logic into reusable action functions in a new `src/actions.ts` file:

- **`generateAndAnnounceTour(client, state)`** - Tour generation orchestration
- **`cancelConcert(client, state, concert)`** - Concert cancellation orchestration

These functions contain the "what to do" logic (post, mutate, save), while callers handle the "when to do it" logic (time checks, concert selection).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Before (Duplicated)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  index.ts:                                                   │
│    handleTourGeneration() {                                  │
│      generate → post → update → add to state → save          │
│    }                                                          │
│                                                               │
│  force-tour.ts:                                              │
│    forceTour() {                                             │
│      generate → post → update → add to state → save          │
│    }                                                          │
│                                                               │
│  index.ts:                                                   │
│    handleCancellations() {                                   │
│      post → update concert → save                            │
│    }                                                          │
│                                                               │
│  cancel-next.ts:                                             │
│    cancelNext() {                                            │
│      post → update concert → save                            │
│    }                                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      After (Extracted)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  actions.ts:                                                 │
│    generateAndAnnounceTour(client, state) {                  │
│      generate → post → update → add to state → save          │
│    }                                                          │
│                                                               │
│    cancelConcert(client, state, concert) {                   │
│      post → update concert → save                            │
│    }                                                          │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  index.ts:                                                   │
│    handleTourGeneration() {                                  │
│      if (shouldGenerateTour) → generateAndAnnounceTour()     │
│    }                                                          │
│    handleCancellations() {                                   │
│      for each concert → cancelConcert()                      │
│    }                                                          │
│                                                               │
│  force-tour.ts:                                              │
│    load state → check canGenerateTour →                      │
│    authenticate → generateAndAnnounceTour()                  │
│                                                               │
│  cancel-next.ts:                                             │
│    load state → find concert → authenticate →                │
│    cancelConcert()                                           │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Design

### New File: `src/actions.ts`

This file contains the extracted orchestration logic for tour generation and concert cancellation.

#### Function 1: `generateAndAnnounceTour()`

```typescript
/**
 * Generate a tour and announce it on Bluesky
 * Mutates state by adding the tour and updating lastTourGenerationDate
 * Saves state to disk after posting
 *
 * @throws Error if posting to Bluesky fails
 */
export async function generateAndAnnounceTour(
  client: BlueskyClient,
  state: State
): Promise<void> {
  // Generate tour
  const tour = generateTour();

  // Post tour announcement (overview + weekly threads)
  const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

  // Update tour with post IDs
  tour.overviewPostId = overviewPostId;
  tour.weeklyPostIds = weeklyPostIds;

  // Update state
  state.tours.push(tour);
  state.lastTourGenerationDate = new Date();

  // Save state
  await saveState(state);
}
```

**Responsibilities:**
- Generate tour using `generateTour()`
- Post to Bluesky via `client.postTourAnnouncement()`
- Update tour object with returned post IDs
- Add tour to state array
- Set `lastTourGenerationDate` to current time
- Persist state to disk

**Error handling:**
- Throws if `client.postTourAnnouncement()` fails
- Throws if `saveState()` fails
- Caller is responsible for try-catch and logging

**State mutation:**
- Mutates `state.tours` by pushing new tour
- Mutates `state.lastTourGenerationDate`
- Mutates tour object by adding post IDs

#### Function 2: `cancelConcert()`

```typescript
/**
 * Cancel a concert by posting to Bluesky and updating state
 * Mutates the concert object by setting isCanceled and cancelPostId
 * Saves state to disk after posting
 *
 * @throws Error if posting to Bluesky fails
 */
export async function cancelConcert(
  client: BlueskyClient,
  state: State,
  concert: Concert
): Promise<void> {
  // Post cancellation
  const cancelPostUri = await client.postCancellation(concert);

  // Update concert state
  concert.isCanceled = true;
  concert.cancelPostId = cancelPostUri;

  // Save state
  await saveState(state);
}
```

**Responsibilities:**
- Post cancellation via `client.postCancellation()`
- Update concert with cancellation status and post ID
- Persist state to disk

**Error handling:**
- Throws if `client.postCancellation()` fails
- Throws if `saveState()` fails
- Caller is responsible for try-catch and logging

**State mutation:**
- Mutates concert object by setting `isCanceled = true`
- Mutates concert object by adding `cancelPostId`

### Modified File: `src/index.ts`

#### Before (lines 48-77):
```typescript
async function handleTourGeneration(): Promise<void> {
  if (!shouldGenerateTour(state)) {
    return;
  }

  console.log('[Main] Time to generate new tour!');

  try {
    // Generate tour
    const tour = generateTour();
    console.log(`[Main] Generated ${tour.concerts.length}-concert tour of ${tour.continent}`);

    // Post tour announcement (overview + weekly threads)
    const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

    // Update tour with post IDs
    tour.overviewPostId = overviewPostId;
    tour.weeklyPostIds = weeklyPostIds;

    // Update state
    state.tours.push(tour);
    state.lastTourGenerationDate = new Date();

    await saveState(state);

    console.log(`[Main] Tour announcement posted: ${tour.concerts.length} concerts over ${Math.max(...tour.concerts.map(c => c.weekInTour))} weeks`);
  } catch (error) {
    console.error('[Main] Error handling tour generation:', error);
  }
}
```

#### After:
```typescript
async function handleTourGeneration(): Promise<void> {
  if (!shouldGenerateTour(state)) {
    return;
  }

  console.log('[Main] Time to generate new tour!');

  try {
    await generateAndAnnounceTour(client, state);

    // Log success (tour info available in state.tours[state.tours.length - 1])
    const tour = state.tours[state.tours.length - 1];
    console.log(`[Main] Tour announcement posted: ${tour.concerts.length} concerts over ${Math.max(...tour.concerts.map(c => c.weekInTour))} weeks`);
  } catch (error) {
    console.error('[Main] Error handling tour generation:', error);
  }
}
```

**Changes:**
- Import `generateAndAnnounceTour` from `./actions.js`
- Replace orchestration logic with single function call
- Keep logging and error handling in place
- Reduce from ~30 lines to ~15 lines

---

#### Before (lines 82-107):
```typescript
async function handleCancellations(): Promise<void> {
  const concertsToCancel = getConcertsToCancelNow(state.tours);

  if (concertsToCancel.length === 0) {
    return;
  }

  console.log(`[Main] Found ${concertsToCancel.length} concerts to cancel`);

  for (const concert of concertsToCancel) {
    try {
      // Post cancellation
      const cancelPostUri = await client.postCancellation(concert);

      // Update concert state
      concert.isCanceled = true;
      concert.cancelPostId = cancelPostUri;

      await saveState(state);

      console.log(`[Main] Canceled concert: ${concert.venue.name}, ${concert.venue.city}`);
    } catch (error) {
      console.error(`[Main] Error canceling concert ${concert.id}:`, error);
    }
  }
}
```

#### After:
```typescript
async function handleCancellations(): Promise<void> {
  const concertsToCancel = getConcertsToCancelNow(state.tours);

  if (concertsToCancel.length === 0) {
    return;
  }

  console.log(`[Main] Found ${concertsToCancel.length} concerts to cancel`);

  for (const concert of concertsToCancel) {
    try {
      await cancelConcert(client, state, concert);
      console.log(`[Main] Canceled concert: ${concert.venue.name}, ${concert.venue.city}`);
    } catch (error) {
      console.error(`[Main] Error canceling concert ${concert.id}:`, error);
    }
  }
}
```

**Changes:**
- Import `cancelConcert` from `./actions.js`
- Replace orchestration logic with single function call
- Keep logging and error handling in place
- Reduce from ~26 lines to ~18 lines

### Modified File: `src/scripts/force-tour.ts`

#### Before (lines 42-89):
```typescript
// Generate tour
console.log('[Force Tour] Generating tour...');
const tour = generateTour();
const weeks = Math.max(...tour.concerts.map(c => c.weekInTour));
console.log(`[Force Tour] Generated ${tour.concerts.length}-concert tour of ${tour.continent} (${weeks} weeks)`);
console.log(`[Force Tour] Date range: ${tour.startDate.toISOString().split('T')[0]} to ${tour.endDate.toISOString().split('T')[0]}`);

// Authenticate Bluesky client
console.log('[Force Tour] Authenticating with Bluesky...');
const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

try {
  await client.authenticate();
} catch (error) {
  console.error('[Force Tour] Authentication failed:', error);
  process.exit(1);
}

// Post tour announcement
console.log('[Force Tour] Posting tour announcement...');
try {
  const announcementResult = await client.postTourAnnouncement(tour);

  // Update tour with post IDs
  tour.overviewPostId = announcementResult.overviewPostId;
  tour.weeklyPostIds = announcementResult.weeklyPostIds;

  console.log(`[Force Tour] Posted overview: ${announcementResult.overviewPostId}`);
  announcementResult.weeklyPostIds.forEach((postId, index) => {
    console.log(`[Force Tour] Posted week ${index + 1} thread: ${postId}`);
  });
} catch (error) {
  console.error('[Force Tour] Failed to post announcement:', error);
  process.exit(1);
}

// Update state
state.tours.push(tour);
state.lastTourGenerationDate = new Date();

try {
  await saveState(state);
  console.log('[Force Tour] State saved successfully');
} catch (error) {
  console.error('[Force Tour] ⚠️  Failed to save state (posts already live):', error);
}

console.log('[Force Tour] ✓ Tour announced successfully!');
```

#### After:
```typescript
// Authenticate Bluesky client
console.log('[Force Tour] Authenticating with Bluesky...');
const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

try {
  await client.authenticate();
} catch (error) {
  console.error('[Force Tour] Authentication failed:', error);
  process.exit(1);
}

// Generate and announce tour
console.log('[Force Tour] Generating and announcing tour...');
try {
  await generateAndAnnounceTour(client, state);

  // Log success details
  const tour = state.tours[state.tours.length - 1];
  const weeks = Math.max(...tour.concerts.map(c => c.weekInTour));
  console.log(`[Force Tour] Generated ${tour.concerts.length}-concert tour of ${tour.continent} (${weeks} weeks)`);
  console.log(`[Force Tour] Date range: ${tour.startDate.toISOString().split('T')[0]} to ${tour.endDate.toISOString().split('T')[0]}`);
  console.log(`[Force Tour] Posted overview: ${tour.overviewPostId}`);
  tour.weeklyPostIds.forEach((postId, index) => {
    console.log(`[Force Tour] Posted week ${index + 1} thread: ${postId}`);
  });
  console.log('[Force Tour] ✓ Tour announced successfully!');
} catch (error) {
  console.error('[Force Tour] Failed to generate and announce tour:', error);
  process.exit(1);
}
```

**Changes:**
- Import `generateAndAnnounceTour` from `../actions.js`
- Remove `generateTour` import (no longer called directly)
- Replace orchestration with single function call
- Move logging after the action (log from saved state)
- Simplify error handling (single try-catch)
- Reduce from ~96 lines to ~55 lines

### Modified File: `src/scripts/cancel-next.ts`

#### Before (lines 44-78):
```typescript
// Authenticate Bluesky client
console.log('[Force Cancel] Authenticating with Bluesky...');
const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

try {
  await client.authenticate();
} catch (error) {
  console.error('[Force Cancel] Authentication failed:', error);
  process.exit(1);
}

// Post cancellation
console.log('[Force Cancel] Posting cancellation...');
let cancelPostId: string;

try {
  cancelPostId = await client.postCancellation(concert);
  console.log(`[Force Cancel] Posted cancellation: ${cancelPostId}`);
} catch (error) {
  console.error('[Force Cancel] Failed to post cancellation:', error);
  process.exit(1);
}

// Update state
concert.isCanceled = true;
concert.cancelPostId = cancelPostId;

try {
  await saveState(state);
  console.log('[Force Cancel] State saved successfully');
} catch (error) {
  console.error('[Force Cancel] ⚠️  Failed to save state (post already live - state inconsistent):', error);
}

console.log('[Force Cancel] ✓ Concert canceled successfully!');
```

#### After:
```typescript
// Authenticate Bluesky client
console.log('[Force Cancel] Authenticating with Bluesky...');
const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

try {
  await client.authenticate();
} catch (error) {
  console.error('[Force Cancel] Authentication failed:', error);
  process.exit(1);
}

// Cancel concert
console.log('[Force Cancel] Posting cancellation...');
try {
  await cancelConcert(client, state, concert);
  console.log(`[Force Cancel] Posted cancellation: ${concert.cancelPostId}`);
  console.log('[Force Cancel] ✓ Concert canceled successfully!');
} catch (error) {
  console.error('[Force Cancel] Failed to cancel concert:', error);
  process.exit(1);
}
```

**Changes:**
- Import `cancelConcert` from `../actions.js`
- Replace orchestration with single function call
- Simplify error handling (single try-catch)
- Log after the action (read from updated concert object)
- Reduce from ~86 lines to ~50 lines

## Benefits

**Single source of truth:**
- Tour generation logic lives in one place
- Concert cancellation logic lives in one place
- Changes propagate automatically to all callers

**Reduced duplication:**
- `index.ts`: 77 → 30 lines of orchestration logic
- `force-tour.ts`: 96 → 55 lines total
- `cancel-next.ts`: 86 → 50 lines total
- **Total reduction: ~124 lines of duplicated code eliminated**

**Improved maintainability:**
- Need to add a post field? Change `actions.ts` only
- Need to change state structure? Change `actions.ts` only
- Need to add validation? Change `actions.ts` only

**Better testability:**
- Can test `generateAndAnnounceTour()` independently
- Can test `cancelConcert()` independently
- Easier to mock dependencies

**Clearer separation of concerns:**
- Actions: "what to do" (generate, post, update, save)
- Callers: "when to do it" (time checks, concert selection)

## Error Handling

**Actions throw errors:**
- `generateAndAnnounceTour()` throws if posting or saving fails
- `cancelConcert()` throws if posting or saving fails

**Callers catch and handle:**
- `index.ts`: Catches, logs, continues (resilient main loop)
- `force-tour.ts`: Catches, logs, exits with code 1
- `cancel-next.ts`: Catches, logs, exits with code 1

**No behavior change:** Error handling strategy remains exactly the same, just moved to callers.

## Testing Strategy

**New tests for `actions.ts`:**
- Test `generateAndAnnounceTour()`:
  - Mocks `generateTour()`, `client.postTourAnnouncement()`, `saveState()`
  - Verifies tour added to state
  - Verifies `lastTourGenerationDate` set
  - Verifies state saved
  - Verifies throws on posting failure
  - Verifies throws on save failure

- Test `cancelConcert()`:
  - Mocks `client.postCancellation()`, `saveState()`
  - Verifies concert marked as canceled
  - Verifies `cancelPostId` set
  - Verifies state saved
  - Verifies throws on posting failure
  - Verifies throws on save failure

**Updated tests for modified files:**
- `index.ts`: Update existing tests to mock `generateAndAnnounceTour()` and `cancelConcert()`
- Scripts: No tests currently exist (acceptable for manual testing utilities)

## Migration Path

**Phase 1: Extract actions**
1. Create `src/actions.ts` with both functions
2. Add tests for `actions.ts`
3. Verify all existing tests pass (no changes to other files yet)
4. Commit

**Phase 2: Refactor index.ts**
1. Update `handleTourGeneration()` to use `generateAndAnnounceTour()`
2. Update `handleCancellations()` to use `cancelConcert()`
3. Update imports
4. Run tests to verify no regressions
5. Commit

**Phase 3: Refactor force-tour.ts**
1. Update to use `generateAndAnnounceTour()`
2. Remove duplicated logic
3. Update imports
4. Test manually
5. Commit

**Phase 4: Refactor cancel-next.ts**
1. Update to use `cancelConcert()`
2. Remove duplicated logic
3. Update imports
4. Test manually
5. Commit

## Non-Goals

**Not included in this refactor:**
- Extracting authentication logic (only 2 lines, not worth abstracting)
- Extracting state loading logic (different patterns for main vs scripts)
- Extracting logging helpers (logging is context-specific)
- Adding dry-run modes (out of scope)
- Changing error handling strategy (keep existing patterns)

## Success Criteria

- [ ] `src/actions.ts` exists with `generateAndAnnounceTour()` and `cancelConcert()`
- [ ] `src/actions.ts` has comprehensive test coverage
- [ ] `index.ts` uses actions, logic reduced by ~60%
- [ ] `force-tour.ts` uses actions, logic reduced by ~40%
- [ ] `cancel-next.ts` uses actions, logic reduced by ~40%
- [ ] All existing tests pass
- [ ] No behavior changes (refactor only)
- [ ] Tour generation works identically in production and force mode
- [ ] Concert cancellation works identically in production and force mode
