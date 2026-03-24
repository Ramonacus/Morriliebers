# Force Actions for Testing - Design Document

**Date**: 2026-03-24
**Status**: Approved
**Purpose**: Enable manual triggering of tour generation and concert cancellation for testing purposes

## Overview

This design decouples time-based scheduling from business logic to enable testing scripts that can force tour generation and concert cancellation without modifying production code or bypassing business rules.

## Problem Statement

The current implementation tightly couples time restrictions within core functions:

- `shouldGenerateTour()` enforces 8:00-14:00 time window check
- `getConcertsToCancelNow()` filters concerts by time comparison
- Scripts cannot force these actions for testing without changing production code

This prevents:
- Manual testing of tour announcements on Bluesky
- Manual testing of cancellation posts on Bluesky
- Quick iteration during development
- Testing edge cases without waiting for specific times

## Solution Architecture

### Separation of Concerns

Split time-aware scheduling logic from pure business logic through a clear boundary:

**Business Logic Layer** (time-agnostic):
- Pure functions that check business rules only
- No awareness of current time
- Used by both production code and testing scripts

**Scheduling Layer** (time-aware):
- Wrapper functions that add time checks
- Call business logic functions
- Used only by production code (`index.ts`)

**Testing Scripts**:
- Call business logic directly
- Bypass time checks intentionally
- Execute real Bluesky posts for end-to-end testing

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Production Flow                      │
│                                                           │
│  index.ts mainLoop()                                     │
│    │                                                      │
│    ├──> shouldGenerateTour() ────> canGenerateTour()    │
│    │         (time + rules)              (rules only)    │
│    │                                                      │
│    └──> getConcertsToCancelNow()                        │
│              (time-filtered)                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Testing Flow                        │
│                                                           │
│  force-tour.ts                                           │
│    └──> canGenerateTour() ──────> generateTour()        │
│              (rules only)                                │
│                                                           │
│  cancel-next.ts                                          │
│    └──> getNextConcertToCancel() ──> client.post()     │
│              (no time filter)                            │
└─────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Scheduler Refactoring (`scheduler.ts`)

#### New Functions

**`canGenerateTour(state: State): boolean`**
- **Purpose**: Pure business logic for tour generation eligibility
- **Checks**:
  - All concerts across all tours are canceled
  - No tour generated today (checks `lastTourGenerationDate`)
- **Does NOT check**: Time of day
- **Returns**: `true` if tour generation is allowed by business rules

**`getNextConcertToCancel(tours: Tour[]): Concert | null`**
- **Purpose**: Find next concert eligible for cancellation
- **Logic**:
  - Filter to uncanceled concerts only
  - Sort by `cancellationDate` ascending
  - Return first (earliest cancellation date)
- **Does NOT check**: Whether cancellation time has arrived
- **Returns**: Concert object or `null` if none found

#### Updated Functions

**`shouldGenerateTour(state: State): boolean`** (existing)
- **Purpose**: Production-ready tour generation check
- **Implementation**:
  ```typescript
  export function shouldGenerateTour(state: State): boolean {
    const now = new Date();
    const hours = now.getHours();

    // Time window check
    if (hours < 8 || hours >= 14) {
      return false;
    }

    // Business rules check
    return canGenerateTour(state);
  }
  ```
- **Backward compatible**: No changes to callers

**`getConcertsToCancelNow(tours: Tour[]): Concert[]`** (existing)
- **No changes needed**: Already filters by time correctly
- Production code continues using this
- Testing scripts use `getNextConcertToCancel()` instead

#### Helper Function

**`isInGenerationWindow(): boolean`** (optional)
- Extracts time check for clarity
- Returns `true` if current hour is 8-13

### 2. Force Tour Script (`src/scripts/force-tour.ts`)

#### Purpose
Generate and announce a new tour immediately, regardless of time restrictions.

#### Flow
1. **Load environment variables**
   - Require `BLUESKY_IDENTIFIER` and `BLUESKY_APP_PASSWORD`
   - Exit with error if missing

2. **Load current state**
   - Read from `data/concerts.json`
   - Parse and validate

3. **Validate business rules** (advisory)
   - Call `canGenerateTour(state)`
   - If `false`:
     - Log reason (active concerts exist OR tour already generated today)
     - Log "Proceeding anyway for testing purposes"
     - Continue execution

4. **Generate tour**
   - Call `generateTour()` from `tourGenerator.ts`
   - Get tour object with concerts, dates, continent

5. **Authenticate Bluesky**
   - Create `BlueskyClient` instance
   - Call `client.authenticate()`
   - Catch and exit on auth failure

6. **Post tour announcement**
   - Call `client.postTourAnnouncement(tour)`
   - Receive `{ overviewPostId, weeklyPostIds }`
   - Catch and exit on post failure (no state saved)

7. **Update state**
   - Add post IDs to tour object
   - Push tour to `state.tours`
   - Set `state.lastTourGenerationDate = new Date()`
   - Call `saveState(state)`

8. **Log success**
   - Continent and date range
   - Number of concerts and weeks
   - Overview post URL
   - Weekly post URLs

#### Error Handling
- **Missing credentials**: Exit with clear message
- **State load failure**: Exit with error
- **Tour generation failure**: Catch, log, exit
- **Bluesky auth failure**: Exit with error
- **Post failure**: Catch, log, exit WITHOUT saving state
- **State save failure**: Log error (posts already live)

#### Example Output
```
[Force Tour] Loading state...
[Force Tour] Loaded 2 tours (14 concerts total)
[Force Tour] Business rule check: FAILED - 3 active concerts remain
[Force Tour] Proceeding anyway for testing purposes
[Force Tour] Generating tour...
[Force Tour] Generated 8-concert tour of Europe (2026-04-07 to 2026-04-28)
[Force Tour] Authenticating with Bluesky...
[Force Tour] Posting tour announcement...
[Force Tour] Posted overview: at://did:plc:abc123/app.bsky.feed.post/xyz789
[Force Tour] Posted week 1 thread: at://did:plc:abc123/app.bsky.feed.post/xyz790
[Force Tour] Posted week 2 thread: at://did:plc:abc123/app.bsky.feed.post/xyz791
[Force Tour] Posted week 3 thread: at://did:plc:abc123/app.bsky.feed.post/xyz792
[Force Tour] Tour announced successfully!
```

### 3. Force Cancel Script (`src/scripts/cancel-next.ts`)

#### Purpose
Cancel the next scheduled concert immediately, regardless of cancellation time.

#### Flow
1. **Load environment variables**
   - Require `BLUESKY_IDENTIFIER` and `BLUESKY_APP_PASSWORD`
   - Exit with error if missing

2. **Load current state**
   - Read from `data/concerts.json`
   - Parse and validate

3. **Find next concert**
   - Call `getNextConcertToCancel(state.tours)`
   - If `null`:
     - Check if no tours exist: log "No tours exist"
     - Check if all canceled: log "All concerts already canceled"
     - Exit gracefully

4. **Authenticate Bluesky**
   - Create `BlueskyClient` instance
   - Call `client.authenticate()`
   - Catch and exit on auth failure

5. **Post cancellation**
   - Call `client.postCancellation(concert)`
   - Receive post URI
   - Catch and exit on post failure (no state saved)

6. **Update state**
   - Set `concert.isCanceled = true`
   - Set `concert.cancelPostId = postUri`
   - Call `saveState(state)`
   - Catch and log on save failure (post already live - warn about inconsistency)

7. **Log success**
   - Venue name and city
   - Original show date
   - Cancellation date (when it was supposed to be canceled)
   - Post URL

#### Error Handling
- **Missing credentials**: Exit with clear message
- **State load failure**: Exit with error
- **No concerts found**: Exit gracefully with explanation
- **Bluesky auth failure**: Exit with error
- **Post failure**: Catch, log, exit WITHOUT saving state
- **State save failure**: Log error and warning about inconsistency

#### Example Output
```
[Force Cancel] Loading state...
[Force Cancel] Loaded 2 tours (14 concerts total)
[Force Cancel] Finding next concert to cancel...
[Force Cancel] Target: Bataclan, Paris - Show: 2026-04-15 20:00
[Force Cancel] Cancellation was scheduled for: 2026-04-14 22:30
[Force Cancel] Authenticating with Bluesky...
[Force Cancel] Posting cancellation...
[Force Cancel] Posted cancellation: at://did:plc:abc123/app.bsky.feed.post/xyz793
[Force Cancel] Concert canceled successfully!
```

### 4. npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "force:tour": "tsx src/scripts/force-tour.ts",
    "force:cancel": "tsx src/scripts/cancel-next.ts"
  }
}
```

#### Usage

```bash
# Generate and announce a new tour
npm run force:tour

# Cancel the next scheduled concert
npm run force:cancel
```

Both require `.env` file with Bluesky credentials.

## Testing Strategy

### Unit Tests

**`scheduler.test.ts` additions:**
- Test `canGenerateTour()` with various states
  - All concerts canceled → `true`
  - Some concerts active → `false`
  - Tour generated today → `false`
- Test `getNextConcertToCancel()` with various tours
  - Multiple uncanceled concerts → returns earliest
  - All canceled → returns `null`
  - Empty tours → returns `null`
  - Mixed canceled/uncanceled → skips canceled

**`shouldGenerateTour()` tests (existing):**
- Update to verify it calls `canGenerateTour()`
- Verify time window still enforced

### Integration Tests

Manual testing with real Bluesky posting:

1. **Force tour generation**
   - Run `npm run force:tour`
   - Verify post appears on Bluesky
   - Verify state updated correctly
   - Verify weekly reply threads created

2. **Force cancellation**
   - Run `npm run force:cancel`
   - Verify cancellation post appears
   - Verify excuse generated by Gemini
   - Verify concert marked as canceled

3. **Sequential operations**
   - Force tour → Force cancel → Force cancel → ...
   - Verify state consistency throughout

## Edge Cases & Error Scenarios

### Force Tour Script

| Scenario | Behavior |
|----------|----------|
| No tours exist | Proceeds - generates first tour |
| Active concerts exist | Logs warning, proceeds |
| Tour generated today | Logs warning, proceeds |
| Bluesky auth fails | Exits with error |
| Tour generation throws | Catches, logs, exits |
| Post announcement fails | Catches, logs, exits (no state saved) |
| State save fails | Logs error (posts already live) |

### Force Cancel Script

| Scenario | Behavior |
|----------|----------|
| No tours exist | Logs "No tours exist", exits gracefully |
| All concerts canceled | Logs "All concerts canceled", exits gracefully |
| One concert left | Cancels it successfully |
| Bluesky auth fails | Exits with error |
| Post cancellation fails | Catches, logs, exits (concert not marked canceled) |
| State save fails | Logs error with inconsistency warning |

## Migration Path

### Phase 1: Refactor Scheduler
1. Add `canGenerateTour()` function
2. Add `getNextConcertToCancel()` function
3. Update `shouldGenerateTour()` to use `canGenerateTour()`
4. Add tests for new functions
5. Verify existing tests still pass

### Phase 2: Create Scripts
1. Implement `force-tour.ts`
2. Implement `cancel-next.ts`
3. Add npm scripts to `package.json`
4. Test manually with real Bluesky posting

### Phase 3: Documentation
1. Update README with script usage
2. Document testing workflow

## Non-Goals

- **Dry-run mode**: Scripts always post to Bluesky (requirement confirmed)
- **Script parameters**: No command-line arguments for concert selection
- **Batch operations**: No "cancel all" or "generate multiple tours" scripts
- **State rollback**: No undo functionality
- **Time travel testing**: No ability to set fake current time (use unit tests for that)

## Future Enhancements

Potential improvements not included in this design:

- `--dry-run` flag to skip Bluesky posting
- `npm run force:cancel:all` to cancel all remaining concerts
- `npm run force:clear` to reset state completely
- Script arguments to specify continent or date range
- Interactive prompts for confirmation
- Better error recovery (retry logic)

## Success Criteria

- [ ] `canGenerateTour()` function exists and is tested
- [ ] `getNextConcertToCancel()` function exists and is tested
- [ ] `shouldGenerateTour()` refactored to use new function
- [ ] All existing tests pass
- [ ] `npm run force:tour` generates and posts tour successfully
- [ ] `npm run force:cancel` cancels and posts cancellation successfully
- [ ] Scripts handle errors gracefully
- [ ] State consistency maintained after script execution
- [ ] No breaking changes to production code
