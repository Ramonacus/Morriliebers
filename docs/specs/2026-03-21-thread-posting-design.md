# Thread-Based Bluesky Posting Design

**Date:** 2026-03-21
**Status:** Approved

## Overview

Refactor Bluesky tour announcement posting from a reply-tree structure (all weekly posts reply to overview) to a thread-chain structure (each post replies to the previous post). Extract the threading logic into a reusable `createThread()` method within the `BlueskyClient` class.

## Current Behavior

The `postTourAnnouncement()` method currently:
1. Posts an overview post (independent)
2. Posts weekly detail posts as direct replies to the overview
3. Result: A reply tree where all weekly posts appear as replies to the root

**Reply structure:**
```
Overview post
├─ Week 1 reply
├─ Week 2 reply
└─ Week 3 reply
```

## Desired Behavior

Change to a thread-chain structure where:
1. First post (overview) is independent
2. Second post (week 1) replies to first post
3. Third post (week 2) replies to second post
4. And so on...

**Thread structure:**
```
Overview post
└─ Week 1 reply
   └─ Week 2 reply
      └─ Week 3 reply
```

This creates a linear thread that users can read sequentially.

## Architecture

### New Method: createThread()

Add a public method to `BlueskyClient`:

```typescript
async createThread(posts: string[]): Promise<string[]>
```

**Parameters:**
- `posts`: Array of text strings to post in sequence

**Returns:**
- Array of post URIs in the same order as input

**Behavior:**
- Posts each text as a reply to the previous post
- First post has no reply structure (independent)
- Subsequent posts chain: each replies to the immediately previous post
- Implements retry logic with exponential backoff
- On failure after retries, throws detailed error with partial state

### Thread Chaining Logic

For each post in the array:

**First post (index 0):**
```typescript
await agent.post({ text: posts[0] })
```

**Subsequent posts (index > 0):**
```typescript
await agent.post({
  text: posts[i],
  reply: {
    root: { uri: firstPostUri, cid: firstPostCid },
    parent: { uri: previousPostUri, cid: previousPostCid }
  }
})
```

**Key invariants:**
- `root` always points to the first post in the thread
- `parent` points to the immediately previous post
- Store each post's URI and CID for the next iteration

### Retry Logic

Each post attempt includes retry handling:

**Parameters:**
- Maximum attempts: 5
- Backoff strategy: Exponential
- Intervals: 1s, 2s, 4s, 8s, 16s

**Implementation:**
```typescript
// Retry loop for each post
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const response = await agent.post({...});
    // Success - break and continue to next post
    break;
  } catch (error) {
    if (attempt === 4) {
      // Final attempt failed - throw ThreadCreationError
      throw new ThreadCreationError(...)
    }
    // Wait before retry
    await sleep(Math.pow(2, attempt) * 1000);
  }
}
```

**Retry behavior:**
- Retries transient network errors
- Does not retry authentication failures (rethrows immediately)
- Logs each retry attempt for debugging

### Error Handling

**Custom error class:**
```typescript
class ThreadCreationError extends Error {
  successfulPosts: string[];  // URIs posted before failure
  failedAtIndex: number;       // Index in posts array that failed
  originalError: Error;        // Underlying error from agent.post()

  constructor(message: string, successfulPosts: string[], failedAtIndex: number, originalError: Error) {
    super(message);
    this.name = 'ThreadCreationError';
    this.successfulPosts = successfulPosts;
    this.failedAtIndex = failedAtIndex;
    this.originalError = originalError;
  }
}
```

**Error behavior:**
- After exhausting all retries, throws `ThreadCreationError`
- Partial thread remains posted (no rollback attempted)
- Caller receives detailed state for debugging/recovery
- Error message includes context: `"Failed to post thread item ${index} after 5 attempts"`

### Helper Function

**sleep() utility:**
```typescript
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

Implements delay between retry attempts.

## Refactoring postTourAnnouncement()

### Current Implementation

The method manually:
1. Posts overview with `agent.post()`
2. Loops through weeks, posting each as reply to overview
3. Constructs reply structure for each weekly post
4. Returns `{ overviewPostId, weeklyPostIds }`

### New Implementation

Simplified to:
1. **Format overview text** (unchanged)
2. **Format all weekly texts** (unchanged, but collect into array)
3. **Call createThread()** with `[overviewText, ...weeklyTexts]`
4. **Parse results** - first URI is overview, rest are weekly posts
5. **Return** same structure: `{ overviewPostId: string, weeklyPostIds: string[] }`

### Code Structure

```typescript
async postTourAnnouncement(tour: Tour): Promise<{
  overviewPostId: string;
  weeklyPostIds: string[];
}> {
  // 1. Format overview text
  const overviewText = `🌍 ¡${tour.continent} Tour Coming up! 🎸\n...`;

  // 2. Format weekly texts
  const weeklyTexts: string[] = [];
  for (let week = 1; week <= weeks; week++) {
    const weekText = `📍 Week ${week} (${weekStartStr} - ${weekEndStr})\n...`;
    weeklyTexts.push(weekText);
  }

  // 3. Create thread
  const postUris = await this.createThread([overviewText, ...weeklyTexts]);

  // 4. Return result
  return {
    overviewPostId: postUris[0],
    weeklyPostIds: postUris.slice(1)
  };
}
```

### Backwards Compatibility

**Return signature:** Unchanged
**External behavior:** Thread structure changes (desired), but return format identical
**Storage format:** Unchanged (still stores post URIs)
**API contract:** Fully compatible

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty posts array | Throw error immediately (invalid input) |
| Single post | Works normally, returns 1-element array |
| Network timeout during retry | Counts as failed attempt, continues retrying |
| CID missing from response | Throw error (protocol violation) |
| Authentication error | Do not retry, throw immediately |
| Partial thread failure | Throw ThreadCreationError with partial state |

## Testing Strategy

### New Tests: createThread()

**Success cases:**
- Posts single-item array correctly (no reply structure)
- Posts multi-item array with correct chain structure
- Verifies each post's `reply.parent` points to previous post
- Verifies all posts' `reply.root` points to first post
- Verifies first post has no reply field
- Returns URIs in correct order

**Retry cases:**
- Transient failure followed by success (verifies retry works)
- Exhausts all 5 retries and throws ThreadCreationError
- Error contains correct `successfulPosts` array
- Error contains correct `failedAtIndex`
- Error contains original error object

**Edge cases:**
- Empty array throws error
- Single post returns single URI
- CID missing from response throws error

### Modified Tests: postTourAnnouncement()

**Changes required:**
- Update assertions to expect chain structure (week 2 replies to week 1)
- Previously: week posts had `reply.parent.uri === overviewUri`
- Now: week N has `reply.parent.uri === weekN-1Uri`

**Unchanged:**
- Overview post content verification
- Weekly post content verification
- Return structure verification
- Concert grouping by week

### Test Implementation

**Mock strategy:**
- Mock `agent.post()` to return `{ uri, cid }` objects
- For retry tests: mock first N attempts to fail, then succeed
- For failure tests: mock all attempts to fail
- Mock time (no actual delays in tests)

**Test isolation:**
- No network calls
- Deterministic results
- Fast execution

## Implementation Notes

### Dependencies

No new external dependencies required. Uses existing:
- `@atproto/api` (BskyAgent)
- Native Promises for async/retry logic

### Logging

Add console logging for:
- Thread creation start: `"[Bluesky] Creating thread with ${posts.length} posts..."`
- Each retry attempt: `"[Bluesky] Retry attempt ${attempt} for post ${index}..."`
- Thread creation success: `"[Bluesky] Thread created successfully with ${uris.length} posts"`
- Thread creation failure: `"[Bluesky] Thread creation failed at post ${index}"`

### Performance Considerations

**Worst case timing:**
- 5 posts, each requires all 5 retry attempts
- Total delay per post: 1+2+4+8+16 = 31 seconds
- Total for 5 posts: 155 seconds (~2.5 minutes)

This is acceptable for the use case (tour announcements are infrequent, typically once per tour generation cycle).

**Typical case timing:**
- 5 posts, all succeed on first attempt
- Total: ~5-10 seconds (network latency)

### Future Enhancements (Not Included)

Potential future improvements:
- Configurable retry parameters (attempts, backoff multiplier)
- Rollback capability (delete partial thread on failure)
- Resume capability (continue from partial state)
- Rate limiting / throttling between posts

These are out of scope for the current design.

## Migration Impact

**Code changes:**
- Modify: `src/blueskyClient.ts` (add createThread, refactor postTourAnnouncement)
- Modify: `src/__tests__/blueskyClient.test.ts` (update tests)

**Data migration:**
- None required (no changes to stored data format)

**Runtime behavior:**
- Thread structure changes from reply-tree to chain
- Existing stored tours unaffected (post URIs remain valid)
- New tours will use chain structure

**User impact:**
- Tour announcement threads appear as linear chains instead of reply trees
- Improves readability for followers scrolling through announcements
- No breaking changes to bot functionality

## Success Criteria

1. ✅ `createThread()` method posts thread chains correctly
2. ✅ Retry logic handles transient failures
3. ✅ Error handling provides detailed partial state
4. ✅ `postTourAnnouncement()` refactored to use `createThread()`
5. ✅ All existing tests updated and passing
6. ✅ New tests for `createThread()` passing
7. ✅ No changes to external API contracts
8. ✅ Tour announcements post as thread chains on Bluesky
