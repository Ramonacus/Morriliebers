# AI-Generated Tour Announcements Design

**Date:** 2026-03-23
**Status:** Approved

## Overview

Replace the hardcoded tour announcement overview post with AI-generated content using Google Gemini, while keeping weekly reply posts in their current structured format. This creates more varied and engaging tour announcements that contrast with the dramatic AI-generated cancellation excuses.

## Current System

Tour announcements consist of:
1. **Overview post** (hardcoded template):
   ```
   🌍 ¡{continent} Tour Coming up! 🎸

   Morriliebers will be touring {continent} during the next {weeks} weeks:
   📅 {startDate} - {endDate}
   🎤 {concertCount} shows

   Details in comments ⬇️
   ```

2. **Weekly reply posts** (structured format with concert details):
   ```
   📍 Week {N} ({weekStart} - {weekEnd})

   {flag} {dayName} {dd/mm} - {HH:mm} - {venue}, {city}
   ...
   ```

## Proposed Changes

### Scope
- **AI-generated:** Overview post only
- **Unchanged:** Weekly reply posts (keep structured format)

### Content Requirements
- **Language:** English (matching current implementation)
- **Tone:** Balanced, professional with slight excitement
- **Purpose:** Contrast with dramatic/melancholic cancellation excuses
- **Length:** 2-4 sentences, under 280 characters (Bluesky limit)
- **Required info:** Continent, date range, show count

## Architecture

### New Module: `src/announcementGenerator.ts`

Mirrors the structure of `excuseGenerator.ts` exactly.

#### Functions

```typescript
function buildPrompt(tour: Tour): string
```
Constructs the Gemini prompt with tour details:
- Continent name
- Date range (formatted like "15 March - 5 April")
- Number of weeks (2-4)
- Total show count

```typescript
async function generateWithGemini(tour: Tour, attempt: number): Promise<string>
```
Makes the Gemini API call:
- Model: `gemini-2.5-flash`
- Temperature: `1.0` (high creativity)
- Logs attempt number and result
- Throws on error

```typescript
function getFallbackMessage(tour: Tour): string
```
Returns the current hardcoded template (identical to existing implementation).

```typescript
export async function generateAnnouncement(tour: Tour): Promise<string>
```
Main entry point with retry logic:
1. Check if `GOOGLE_GENERATIVE_AI_API_KEY` exists
   - If not: return fallback immediately with warning
2. Attempt 1: Call `generateWithGemini()`
   - If success: return result
   - If failure: log error, wait 60 seconds
3. Attempt 2: Call `generateWithGemini()` again
   - If success: return result
   - If failure: log warning, return fallback

### Modified Module: `src/blueskyClient.ts`

**Change in `postTourAnnouncement()` method (~line 135):**

```typescript
// Before:
const overviewText = `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;

// After:
const overviewText = await generateAnnouncement(tour);
```

**Import statement to add:**
```typescript
import { generateAnnouncement } from "./announcementGenerator.js";
```

## Prompt Engineering

### Style Guidelines for Gemini

The prompt should instruct Gemini to:
- Use balanced, professional tone with slight excitement
- Write legitimate band announcements (not over-the-top)
- Keep it brief: 2-4 sentences, under 280 characters
- Include continent, date range, and show count
- Write in English
- Avoid dramatic/melancholic language (that's for cancellations)
- Avoid ticket links or specific venue mentions

### Example Desired Outputs

✅ Good examples:
- "Morriliebers announces their 3-week European tour! 9 shows across the continent from 15 March to 5 April. Tickets on sale soon."
- "Big news! Morriliebers is hitting North America for 8 concerts over the next 4 weeks (12 April - 10 May). See you on the road!"
- "Asia tour confirmed! Morriliebers will perform 6 shows across 2 weeks starting 20 March. Details in comments."

❌ Avoid:
- Overly dramatic: "The weight of existence compels us to tour Europe..."
- Too casual: "lol we're going to asia guys"
- Missing info: "Tour announcement!" (no details)
- Too long: exceeds 280 characters

## Error Handling

### API Key Missing
- **Behavior:** Return fallback immediately
- **Logging:** Warning message
- **Result:** Bot continues with hardcoded template

### Gemini API Failures
- **Retry:** Once after 60 seconds
- **Fallback:** If both attempts fail, use hardcoded template
- **Logging:** Error on first failure, warning on second
- **Result:** Bot continues, user sees valid announcement

### Character Limit Violations
- **Risk:** Low (prompt specifies limit)
- **Mitigation:** Prompt explicitly requests "under 280 characters"
- **Fallback:** If Bluesky API rejects, tour is already saved with that text
- **Optional improvement:** Could add character validation and re-fallback

### Invalid Response Format
- **Handled by:** Vercel AI SDK's `generateText()` function
- **Result:** Falls through to fallback on any error

## Testing Strategy

### New Test File: `src/__tests__/announcementGenerator.test.ts`

**Test cases (mirror excuse generator):**

1. **API key missing**
   - Mock: No `GOOGLE_GENERATIVE_AI_API_KEY` env var
   - Assert: Returns fallback immediately
   - Assert: Logs warning about missing key

2. **Successful generation (first attempt)**
   - Mock: Gemini returns valid text on first call
   - Assert: Returns AI-generated text
   - Assert: Logs success message

3. **Retry logic**
   - Mock: First attempt throws error, second succeeds
   - Assert: Waits 60 seconds between attempts
   - Assert: Returns result from second attempt

4. **Complete failure (both attempts)**
   - Mock: Both Gemini calls throw errors
   - Assert: Returns fallback message
   - Assert: Logs warning about using fallback

5. **Fallback message format**
   - Assert: Fallback matches current template exactly
   - Assert: Contains all required info (continent, dates, count)

### Modified Test File: `src/__tests__/blueskyClient.test.ts`

**Update `postTourAnnouncement()` test:**
- Mock `generateAnnouncement()` to return test text
- Assert: Overview post uses AI-generated content
- Assert: Weekly reply posts remain unchanged (structured format)

### Manual Testing

**With API key:**
- Generate tour and verify AI-generated announcement posts to Bluesky
- Verify weekly posts maintain structured format

**Without API key:**
- Generate tour and verify fallback template is used
- Confirm bot continues normally

## Implementation Checklist

1. Create `src/announcementGenerator.ts`
   - Implement `buildPrompt(tour)`
   - Implement `generateWithGemini(tour, attempt)`
   - Implement `getFallbackMessage(tour)`
   - Implement `generateAnnouncement(tour)` with retry logic

2. Update `src/blueskyClient.ts`
   - Import `generateAnnouncement`
   - Replace hardcoded overview text with `await generateAnnouncement(tour)`

3. Create `src/__tests__/announcementGenerator.test.ts`
   - Test all scenarios (API key missing, success, retry, failure, fallback)

4. Update `src/__tests__/blueskyClient.test.ts`
   - Mock `generateAnnouncement()` in tour announcement test

5. Manual verification
   - Test with/without API key
   - Verify Bluesky posts

## Dependencies

- Existing: `ai` package (Vercel AI SDK)
- Existing: `@ai-sdk/google` package
- Existing: `GOOGLE_GENERATIVE_AI_API_KEY` environment variable (optional)

No new dependencies required.

## Success Criteria

- Overview posts use AI-generated text when API key is present
- Weekly reply posts remain unchanged (structured format)
- Fallback to hardcoded template when API unavailable
- Retry logic works (60-second wait, 2 attempts)
- All tests pass
- Bot continues normally on any failure
- Announcements are varied and engaging (manual verification)
- Tone contrasts with cancellation excuses (professional vs. dramatic)
