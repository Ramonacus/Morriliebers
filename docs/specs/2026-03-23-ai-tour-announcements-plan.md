# AI-Generated Tour Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded tour announcement overview posts with AI-generated content using Google Gemini.

**Architecture:** New `announcementGenerator.ts` module mirrors `excuseGenerator.ts` structure. Minimal changes to `blueskyClient.ts` (one import, one line). Weekly reply posts unchanged.

**Tech Stack:** TypeScript, Vitest, Vercel AI SDK (`ai`), Google Gemini (`@ai-sdk/google`)

---

## File Structure

**New Files:**
- `src/announcementGenerator.ts` - AI generation module (mirrors excuseGenerator.ts)
- `src/__tests__/announcementGenerator.test.ts` - Tests for announcement generator

**Modified Files:**
- `src/blueskyClient.ts:2` - Add import for generateAnnouncement
- `src/blueskyClient.ts:135-141` - Replace hardcoded overview text with AI call
- `src/__tests__/blueskyClient.test.ts` - Mock generateAnnouncement in tests

---

## Task 1: Create Announcement Generator Module (Fallback Only)

**Files:**
- Create: `src/announcementGenerator.ts`
- Test: `src/__tests__/announcementGenerator.test.ts`

Start with fallback logic only (no AI yet) to establish module structure and test infrastructure.

- [ ] **Step 1: Write failing test for fallback message format**

Create `src/__tests__/announcementGenerator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAnnouncement } from '../announcementGenerator.js';
import type { Tour } from '../types.js';
import { createTour } from './fixtures.js';

describe('announcementGenerator', () => {
  describe('getFallbackMessage', () => {
    it('should format fallback message with tour details', async () => {
      // Remove API key to force fallback
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const tour = createTour({
        continent: 'Europe',
        startDate: new Date('2026-04-15'),
        endDate: new Date('2026-05-05'),
        concerts: [], // Will be populated by createTour
      });

      const result = await generateAnnouncement(tour);

      expect(result).toContain('Europe');
      expect(result).toContain('15 April');
      expect(result).toContain('5 May');
      expect(result).toContain('shows');
      expect(result).toContain('🌍');
      expect(result).toContain('🎸');

      // Restore key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: FAIL - "Cannot find module '../announcementGenerator.js'"

- [ ] **Step 3: Create announcement generator module with fallback only**

Create `src/announcementGenerator.ts`:

```typescript
import type { Tour } from './types.js';

/**
 * Generate fallback message when AI generation fails
 */
function getFallbackMessage(tour: Tour): string {
  const startStr = tour.startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const endStr = tour.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });

  const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

  return `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;
}

/**
 * Generate AI announcement for tour (fallback only for now)
 */
export async function generateAnnouncement(tour: Tour): Promise<string> {
  console.log(`[AnnouncementGenerator] Generating announcement for ${tour.continent} tour`);

  // Check if API key is available
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[AnnouncementGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
    return getFallbackMessage(tour);
  }

  // AI generation not implemented yet, use fallback
  console.warn('[AnnouncementGenerator] AI generation not implemented, using fallback');
  return getFallbackMessage(tour);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: PASS - Fallback message contains all required elements

- [ ] **Step 5: Commit**

```bash
git add src/announcementGenerator.ts src/__tests__/announcementGenerator.test.ts
git commit -m "feat: add announcement generator with fallback message

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add AI Generation with Retry Logic

**Files:**
- Modify: `src/announcementGenerator.ts`
- Test: `src/__tests__/announcementGenerator.test.ts`

Add Gemini AI integration following excuseGenerator.ts pattern.

- [ ] **Step 1: Write failing test for successful AI generation**

Add to `src/__tests__/announcementGenerator.test.ts`:

```typescript
import { generateText } from 'ai';

// Add at top with other imports
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Add new describe block
describe('generateAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure API key is set for these tests
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return AI-generated text on first attempt success', async () => {
    const tour = createTour({
      continent: 'Asia',
      concerts: Array(6).fill(null).map((_, i) => ({
        weekInTour: Math.floor(i / 3) + 1,
      })),
    });

    const mockAIText = 'Asia tour confirmed! Morriliebers will perform 6 shows across 2 weeks starting 20 March.';
    vi.mocked(generateText).mockResolvedValueOnce({
      text: mockAIText,
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50 },
    } as any);

    const result = await generateAnnouncement(tour);

    expect(result).toBe(mockAIText);
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: FAIL - Test timeout or returns fallback instead of AI text

- [ ] **Step 3: Implement AI generation with retry logic**

Update `src/announcementGenerator.ts`:

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Tour } from './types.js';

/**
 * Build prompt for Gemini to generate tour announcement
 */
function buildPrompt(tour: Tour): string {
  const startStr = tour.startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const endStr = tour.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

  return `You are generating a tour announcement for a Morrissey tribute band called "Morriliebers".

Tour Details:
- Continent: ${tour.continent}
- Date Range: ${startStr} - ${endStr}
- Duration: ${weeks} weeks
- Total Shows: ${tour.concerts.length}

Style Guidelines:
- Balanced, professional tone with slight excitement
- Write a legitimate band announcement (not over-the-top or dramatic)
- Contrast with the dramatic/melancholic cancellation excuses
- Keep it brief: 2-4 sentences, under 280 characters
- MUST include: continent, date range, and show count
- Write in English
- Avoid ticket links or specific venue mentions (those go in reply posts)

Example styles:
- "Morriliebers announces their ${weeks}-week ${tour.continent} tour! ${tour.concerts.length} shows from ${startStr} to ${endStr}. Tickets on sale soon."
- "Big news! Morriliebers is hitting ${tour.continent} for ${tour.concerts.length} concerts over ${weeks} weeks. See you on the road!"
- "${tour.continent} tour confirmed! Morriliebers will perform ${tour.concerts.length} shows across ${weeks} weeks starting ${startStr}."

Generate a professional tour announcement now:`;
}

/**
 * Call Gemini API to generate announcement
 */
async function generateWithGemini(tour: Tour, attempt: number): Promise<string> {
  try {
    console.log(`[AnnouncementGenerator] Attempt ${attempt}: Calling Gemini API`);

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: buildPrompt(tour),
      temperature: 1.0,
    });

    console.log(`[AnnouncementGenerator] Attempt ${attempt} succeeded: ${result.text.substring(0, 50)}...`);
    return result.text;
  } catch (error) {
    console.error(`[AnnouncementGenerator] Attempt ${attempt} failed:`, error);
    throw error;
  }
}

/**
 * Generate fallback message when AI generation fails
 */
function getFallbackMessage(tour: Tour): string {
  const startStr = tour.startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const endStr = tour.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });

  const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

  return `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;
}

/**
 * Generate AI announcement for tour with retry logic
 */
export async function generateAnnouncement(tour: Tour): Promise<string> {
  console.log(`[AnnouncementGenerator] Generating announcement for ${tour.continent} tour`);

  // Check if API key is available
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[AnnouncementGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
    return getFallbackMessage(tour);
  }

  try {
    // Attempt 1
    try {
      return await generateWithGemini(tour, 1);
    } catch (error) {
      console.log('[AnnouncementGenerator] Retrying in 1 minute...');

      // Wait 1 minute before retry
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Attempt 2
      return await generateWithGemini(tour, 2);
    }
  } catch (error) {
    console.warn('[AnnouncementGenerator] Both attempts failed, using fallback message');
    return getFallbackMessage(tour);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: PASS - AI text returned on successful generation

- [ ] **Step 5: Commit**

```bash
git add src/announcementGenerator.ts src/__tests__/announcementGenerator.test.ts
git commit -m "feat: implement AI generation with Gemini and retry logic

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add Retry Logic Tests

**Files:**
- Test: `src/__tests__/announcementGenerator.test.ts`

Test retry behavior when first attempt fails.

- [ ] **Step 1: Write failing test for retry logic**

Add to `src/__tests__/announcementGenerator.test.ts`:

```typescript
it('should retry after 1 minute if first attempt fails', async () => {
  const tour = createTour({ continent: 'South America' });

  const mockAIText = 'South America tour announced! Details in comments.';

  // First call fails, second succeeds
  vi.mocked(generateText)
    .mockRejectedValueOnce(new Error('API error'))
    .mockResolvedValueOnce({
      text: mockAIText,
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50 },
    } as any);

  // Mock setTimeout to avoid waiting
  vi.useFakeTimers();

  const promise = generateAnnouncement(tour);

  // Fast-forward 1 minute
  await vi.advanceTimersByTimeAsync(60000);

  const result = await promise;

  expect(result).toBe(mockAIText);
  expect(generateText).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: PASS - Retry logic works correctly

- [ ] **Step 3: Write failing test for complete failure (both attempts)**

Add to `src/__tests__/announcementGenerator.test.ts`:

```typescript
it('should return fallback after both attempts fail', async () => {
  const tour = createTour({
    continent: 'North America',
    startDate: new Date('2026-04-20'),
    endDate: new Date('2026-05-10'),
  });

  // Both calls fail
  vi.mocked(generateText)
    .mockRejectedValueOnce(new Error('API error 1'))
    .mockRejectedValueOnce(new Error('API error 2'));

  vi.useFakeTimers();

  const promise = generateAnnouncement(tour);
  await vi.advanceTimersByTimeAsync(60000);

  const result = await promise;

  expect(result).toContain('North America');
  expect(result).toContain('20 April');
  expect(result).toContain('10 May');
  expect(generateText).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/__tests__/announcementGenerator.test.ts`

Expected: PASS - Fallback used after both failures

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/announcementGenerator.test.ts
git commit -m "test: add retry logic and failure fallback tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Integrate with BlueskyClient

**Files:**
- Modify: `src/blueskyClient.ts:2,135-141`
- Test: `src/__tests__/blueskyClient.test.ts`

Replace hardcoded overview text with AI generation.

- [ ] **Step 1: Write failing test for AI-generated overview**

Update `src/__tests__/blueskyClient.test.ts` - find the `postTourAnnouncement` test and modify it:

```typescript
// Add at top with other imports
import { generateAnnouncement } from '../announcementGenerator.js';

// Add mock
vi.mock('../announcementGenerator.js', () => ({
  generateAnnouncement: vi.fn(),
}));

// In the postTourAnnouncement test, add at the start:
it('should post tour overview and weekly threads', async () => {
  // Mock AI generation
  const mockOverviewText = 'Europe tour announced! 8 shows over 3 weeks. Details below.';
  vi.mocked(generateAnnouncement).mockResolvedValueOnce(mockOverviewText);

  // ... rest of existing test

  // Add assertion to verify AI text was used
  expect(generateAnnouncement).toHaveBeenCalledWith(mockTour);
  expect(mockAgent.post).toHaveBeenCalledWith(
    expect.objectContaining({
      text: mockOverviewText,
    })
  );
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/__tests__/blueskyClient.test.ts`

Expected: FAIL - generateAnnouncement not called, hardcoded text used

- [ ] **Step 3: Update BlueskyClient to use AI generation**

Modify `src/blueskyClient.ts`:

```typescript
// Add import at line 2 (after existing imports)
import { generateAnnouncement } from "./announcementGenerator.js";

// Replace lines 135-141 in postTourAnnouncement method:
// BEFORE:
const overviewText = `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;

// AFTER:
const overviewText = await generateAnnouncement(tour);
```

Full context around the change (lines 119-142):

```typescript
  async postTourAnnouncement(tour: Tour): Promise<{
    overviewPostId: string;
    weeklyPostIds: string[];
  }> {
    try {
      console.log("[Bluesky] Posting tour announcement...");

      // Format dates
      const startStr = tour.startDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      });
      const endStr = tour.endDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      });

      // Calculate tour duration in weeks
      const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

      // Generate AI overview text
      const overviewText = await generateAnnouncement(tour);

      // Group concerts by week
      const concertsByWeek = new Map<number, Concert[]>();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/__tests__/blueskyClient.test.ts`

Expected: PASS - AI generation called and text used in post

- [ ] **Step 5: Run all tests to verify nothing broke**

Run: `npm test`

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/blueskyClient.ts src/__tests__/blueskyClient.test.ts
git commit -m "feat: integrate AI-generated announcements in BlueskyClient

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Manual Verification

**Files:**
- None (manual testing)

Verify the implementation works end-to-end.

- [ ] **Step 1: Test with API key (optional)**

If you have a Google API key:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
npm run dev
```

Watch logs for:
- `[AnnouncementGenerator] Attempt 1: Calling Gemini API`
- `[AnnouncementGenerator] Attempt 1 succeeded: ...`
- Verify Bluesky posts contain AI-generated text

- [ ] **Step 2: Test without API key**

```bash
unset GOOGLE_GENERATIVE_AI_API_KEY
npm run dev
```

Watch logs for:
- `[AnnouncementGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback`
- Verify Bluesky posts contain fallback template

- [ ] **Step 3: Review test coverage**

Run: `npm test -- --coverage`

Verify `announcementGenerator.ts` has >90% coverage

- [ ] **Step 4: Verify weekly posts unchanged**

Confirm weekly reply posts still use structured format (not AI-generated)

---

## Completion Checklist

- [ ] All tests passing (`npm test`)
- [ ] New module mirrors excuseGenerator.ts structure
- [ ] AI generation works with retry logic
- [ ] Fallback works when API unavailable
- [ ] BlueskyClient integration complete
- [ ] Weekly posts unchanged (structured format)
- [ ] No breaking changes to existing features
- [ ] Commits follow conventional commits format

---

## Skills Referenced

- @superpowers:test-driven-development - Follow TDD pattern throughout
- @superpowers:verification-before-completion - Run tests before claiming completion
