# Trigger Scripts Design

**Date:** 2026-03-20
**Status:** Approved

## Overview

Implement two manual trigger scripts for testing and operational control:
- `trigger:announce` - Generate and announce a new tour, bypassing all restrictions
- `trigger:cancel-next` - Cancel the next chronologically upcoming concert

## Motivation

The README documents these scripts but they don't exist yet. They're useful for:
- Testing the full announcement/cancellation flow without waiting
- Manual intervention when needed
- Debugging state issues
- Demo purposes

## Architecture

### Design Principle

Scripts act as thin CLI wrappers around existing modules. They orchestrate business logic but don't duplicate it. All core functionality stays in existing modules:

- `tourGenerator.ts` - generates tours
- `blueskyClient.ts` - posts to Bluesky
- `scheduler.ts` - finds concerts to cancel
- `storage.ts` - loads/saves state

Scripts handle only CLI concerns:
- Environment setup (dotenv)
- Console logging
- Error handling
- Exit codes

This follows the pattern established in `utils.ts`.

### File Structure

```
src/scripts/
├── utils.ts          # Existing: shared utilities
├── announce.ts       # New: tour announcement trigger
└── cancel-next.ts    # New: cancellation trigger
```

## Script: announce.ts

### Purpose

Generate and announce a new tour immediately, bypassing:
- Time restrictions (8:00-14:00 check)
- Active concert checks
- Daily generation limits

### Flow

1. Load environment variables
2. Initialize and authenticate Bluesky client
3. Load current state
4. Generate new tour using `generateTour()`
5. Post tour announcement via `postTourAnnouncement()`
6. Update tour with post IDs
7. Update state: add tour, set `lastTourGenerationDate`
8. Save state
9. Exit with code 0

### Error Handling

- Authentication failure → Exit 1
- State load failure → Exit 1
- Tour generation failure → Exit 1
- Bluesky post failure → Exit 1 (don't save state)
- State save failure → Exit 1

### Console Output

```
[Scripts] Authenticating with Bluesky...
[Scripts] Loaded state with 2 tours (15 concerts)
[Scripts] Generating new tour...
[Scripts] Tour generated: 3 weeks, 7 concerts in Europe
[Scripts] Posting tour announcement...
[Scripts] Tour announcement posted successfully
[Scripts] State saved successfully
```

### Dependencies

- `dotenv/config` - Load .env
- `utils.ts` - `initializeClient()`, `loadAndValidateState()`, `saveAndExit()`
- `tourGenerator.ts` - `generateTour()`
- `types.ts` - Type definitions

## Script: cancel-next.ts

### Purpose

Cancel the next chronologically upcoming concert (earliest by concert date, not cancellation date) and post the cancellation to Bluesky.

### Flow

1. Load environment variables
2. Initialize and authenticate Bluesky client
3. Load current state
4. Find next uncanceled concert:
   - Extract all concerts from all tours
   - Filter to uncanceled only
   - Sort by concert date ascending
   - Take first concert
5. If no concerts found → Error, exit 1
6. Post cancellation via `postCancellation()`
7. Mark concert as canceled, store post ID
8. Save state
9. Exit with code 0

### Error Handling

- Authentication failure → Exit 1
- State load failure → Exit 1
- No uncanceled concerts → Exit 1 with error message
- Bluesky post failure → Exit 1 (don't save state)
- State save failure → Exit 1

### Console Output

**Success case:**
```
[Scripts] Authenticating with Bluesky...
[Scripts] Loaded state with 2 tours (15 concerts)
[Scripts] Found next concert: Madison Square Garden, New York on 2026-03-25
[Scripts] Posting cancellation...
[Scripts] Cancellation posted successfully
[Scripts] State saved successfully
```

**No concerts case:**
```
[Scripts] Authenticating with Bluesky...
[Scripts] Loaded state with 2 tours (15 concerts)
[Scripts] Error: No uncanceled concerts found
```

### Dependencies

- `dotenv/config` - Load .env
- `utils.ts` - `initializeClient()`, `loadAndValidateState()`, `saveAndExit()`
- `types.ts` - Type definitions

### Finding Next Concert Logic

Create a helper function within cancel-next.ts:

```typescript
function findNextConcert(state: State): Concert | null {
  const allConcerts = state.tours.flatMap(tour => tour.concerts);
  const uncanceled = allConcerts.filter(c => !c.isCanceled);

  if (uncanceled.length === 0) {
    return null;
  }

  uncanceled.sort((a, b) => a.date.getTime() - b.date.getTime());
  return uncanceled[0];
}
```

This logic is specific to this script and won't be reused elsewhere, so it doesn't need to be extracted to a shared module.

## Testing Strategy

### Test Files

- `src/__tests__/announce.test.ts` - Tests for announce script
- `src/__tests__/cancel-next.test.ts` - Tests for cancel-next script

### Test Approach

Mock all external dependencies:
- `dotenv/config` - No mocking needed (side effect only)
- `initializeClient()` - Mock to return fake client
- `loadAndValidateState()` - Mock to return test state
- `saveAndExit()` - Mock to capture calls
- `generateTour()` - Mock to return test tour
- `blueskyClient.postTourAnnouncement()` - Mock to return post IDs
- `blueskyClient.postCancellation()` - Mock to return post ID
- `process.exit()` - Mock to capture exit codes

### Test Coverage

**announce.test.ts:**
1. Successfully generates and announces tour
2. Updates state with new tour and lastTourGenerationDate
3. Calls saveAndExit with correct state and exit code 0
4. Handles errors gracefully

**cancel-next.test.ts:**
1. Finds and cancels earliest uncanceled concert
2. Updates concert state (isCanceled, cancelPostId)
3. Calls saveAndExit with correct state and exit code 0
4. Exits with error when no uncanceled concerts
5. Handles errors gracefully

### Test Fixtures

Reuse existing fixtures from `src/__tests__/fixtures.ts` (createMockTour, createMockConcert, etc.)

## Implementation Notes

1. **Import dotenv at top:** `import 'dotenv/config'` ensures env vars are loaded
2. **Async main function:** Wrap logic in async function for top-level await
3. **No new shared utilities:** All new code stays in script files
4. **Consistent logging:** Use `[Scripts]` prefix like utils.ts
5. **Exit codes:** 0 = success, 1 = error
6. **Process isolation:** Scripts should warn users to stop the bot first (already documented in README)
