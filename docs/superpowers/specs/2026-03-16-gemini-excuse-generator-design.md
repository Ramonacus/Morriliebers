# Gemini Excuse Generator Design

**Date:** 2026-03-16
**Status:** Approved
**Author:** Claude Code

## Overview

Replace the static concert cancellation message with AI-generated excuses using Google Gemini. The excuses will blend Morrissey-style drama, health-related reasons, and absurdist creativity while always including venue and date details.

## Goals

- Generate creative, varied cancellation excuses for each concert
- Maintain authentic Morrissey tribute band character
- Ensure reliability with retry logic and fallback
- Keep messages brief (1-2 sentences, under 280 characters)
- Integrate cleanly into existing architecture

## Non-Goals

- Generate weekly announcement messages (only cancellations)
- Support multiple AI providers initially
- Store/cache generated excuses
- User-configurable excuse styles

## Architecture

### New Module: `src/excuseGenerator.ts`

**Public API:**
```typescript
export async function generateExcuse(concert: Concert): Promise<string>
```

**Internal Functions:**
- `generateWithGemini(concert: Concert, attempt: number): Promise<string>` - Call Gemini API
- `getFallbackMessage(concert: Concert): string` - Static fallback message
- `buildPrompt(concert: Concert): string` - Construct Gemini prompt

**Module Responsibilities:**
- Construct prompts with concert details
- Call Gemini API with retry logic
- Handle all AI-related errors
- Return fallback message on failure
- Log attempts and outcomes

### Modified Module: `src/blueskyClient.ts`

**Changes to `postCancellation()` method:**
- Import `generateExcuse` from `excuseGenerator.ts`
- Replace static message construction with `await generateExcuse(concert)`
- Remove date formatting logic (now in excuse generator)
- All other logic unchanged

**Before:**
```typescript
const dateStr = concert.date.toLocaleDateString('en-US', {
  day: '2-digit',
  month: '2-digit',
});
const text = `Morriliebers regrets to announce the cancellation of the concert at ${concert.venue.name} on ${dateStr}`;
```

**After:**
```typescript
const text = await generateExcuse(concert);
```

## Gemini Integration

### Model Configuration

- **Model:** `gemini-2.0-flash-exp`
- **Temperature:** `1.0` (high creativity for varied excuses)
- **Max Tokens:** `100` (brief 1-2 sentence responses)
- **SDK:** Vercel AI SDK (`ai` + `@ai-sdk/google`)

### API Call Structure

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const result = await generateText({
  model: google('gemini-2.0-flash-exp'),
  prompt: buildPrompt(concert),
  temperature: 1.0,
  maxTokens: 100,
});

return result.text;
```

### Retry Logic

1. **Attempt 1:** Initial Gemini API call
2. **If fails:** Wait 1 minute (60,000ms)
3. **Attempt 2:** Retry Gemini API call
4. **If fails:** Return static fallback message

**Errors Handled:**
- Network errors
- API key missing/invalid
- Rate limiting
- Timeout
- Invalid response format
- Any other runtime errors

### Logging

```
[ExcuseGenerator] Generating excuse for concert at {venue.name}
[ExcuseGenerator] Attempt 1 failed: {error message}
[ExcuseGenerator] Retrying in 1 minute...
[ExcuseGenerator] Attempt 2 failed: {error message}
[ExcuseGenerator] Using fallback message
[ExcuseGenerator] Generated excuse: {text preview}
```

## Prompt Engineering

### Prompt Template

```
You are generating a creative cancellation excuse for a Morrissey tribute band called "Morriliebers".

Concert Details:
- Venue: {venue.name}
- City: {venue.city}
- Date: {formatted date DD/MM}

Style Guidelines:
- Mix of: dramatic/melancholic Morrissey-style, health-related, or absurdist
- MUST include the venue name, city, and date somewhere in the message
- Keep it brief: 1-2 sentences, under 280 characters
- Write the complete cancellation announcement (not just the excuse)
- Be creative with how you integrate the venue/date details

Example styles:
- Dramatic: "The existential weight of performing in {city} has proven unbearable..."
- Health: "Vocal complications exacerbated by {city}'s atmospheric conditions..."
- Absurdist: "An urgent matter involving vintage vinyl has made the {date} concert impossible..."

Generate a creative cancellation message now:
```

### Prompt Variables

- `{venue.name}` - e.g., "Sala But"
- `{venue.city}` - e.g., "Madrid"
- `{formatted date DD/MM}` - e.g., "20/03"

### Expected Output Examples

- "The oppressive weight of Madrid's modernity has rendered performance at Sala But on 20/03 spiritually untenable."
- "Vocal strain from the dry Madrid air necessitates rest. The concert at Sala But on 20/03 cannot proceed."
- "An urgent matter involving rare Smiths memorabilia has made the 20/03 performance at Sala But in Madrid impossible."

## Fallback Message

If both Gemini attempts fail:

```typescript
function getFallbackMessage(concert: Concert): string {
  const dateStr = concert.date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });
  return `Morriliebers regrets to announce the cancellation of the concert at ${concert.venue.name} on ${dateStr}`;
}
```

This matches the current static message format.

## Environment Configuration

### New Environment Variable

**`.env`:**
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

**`.env.example`:**
```bash
# Bluesky Credentials
BLUESKY_IDENTIFIER=your-username.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

### API Key Handling

- If missing: Log warning, skip Gemini calls, use fallback immediately
- If invalid: Caught as API error, triggers retry logic, then fallback
- No fatal errors from missing/invalid keys

## Dependencies

### New Dependencies

**Production:**
```json
"ai": "^3.0.0",
"@ai-sdk/google": "^0.0.15"
```

**Installation:**
```bash
npm install ai @ai-sdk/google
```

### Existing Dependencies (Unchanged)

- `@atproto/api` - Bluesky API
- `dotenv` - Environment variables
- `vitest` - Testing
- `tsx` - TypeScript execution

## Testing Strategy

### New Test File: `src/__tests__/excuseGenerator.test.ts`

**Test Cases:**

1. **Successful generation on first attempt**
   - Mock Gemini to return excuse
   - Verify excuse is returned
   - Verify no retry logic triggered

2. **First attempt fails, second succeeds**
   - Mock Gemini to fail once, then succeed
   - Verify 1-minute delay between attempts
   - Verify second attempt result is returned

3. **Both attempts fail**
   - Mock Gemini to fail twice
   - Verify fallback message is returned
   - Verify message includes venue and date

4. **Prompt construction**
   - Verify venue name included in prompt
   - Verify city included in prompt
   - Verify formatted date included in prompt

5. **Missing API key**
   - Mock missing env var
   - Verify fallback used immediately
   - Verify warning logged

6. **Character limit compliance**
   - Verify generated excuses under 280 characters
   - (If possible to assert on mocked responses)

### Modified Test File: `src/__tests__/blueskyClient.test.ts`

**Changes:**

1. Mock `excuseGenerator` module:
   ```typescript
   vi.mock('../excuseGenerator.js', () => ({
     generateExcuse: vi.fn().mockResolvedValue('Mocked excuse message')
   }));
   ```

2. Update "creates cancellation post for single concert" test:
   - Verify `generateExcuse` called with concert object
   - Verify returned text passed to `agent.post()`

3. Existing tests remain valid (no breaking changes)

### Test Coverage

- **Before:** 75 tests (74 passing, 1 skipped)
- **After:** ~81 tests (new excuse generator tests)
- **Target:** 100% coverage for excuse generator module

### Manual Testing

1. Set real `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`
2. Create upcoming concert in state
3. Run `npm run trigger:cancel-next`
4. Verify AI-generated excuse posts to Bluesky
5. Check logs for Gemini API calls
6. Test failure: Remove API key, verify fallback works

## Error Handling

### Error Scenarios

| Scenario | Behavior |
|----------|----------|
| Network timeout | Retry once after 1 minute, then fallback |
| Invalid API key | Retry once after 1 minute, then fallback |
| Rate limit hit | Retry once after 1 minute, then fallback |
| Empty response | Retry once after 1 minute, then fallback |
| Response too long | Use response if under 280 chars, else retry |
| Missing env var | Log warning, use fallback immediately |
| Gemini service down | Retry once after 1 minute, then fallback |

### Logging Levels

- **Info:** Successful generation, attempt numbers
- **Warning:** Missing API key, fallback usage
- **Error:** API call failures, network errors

### No Fatal Errors

- Excuse generation never throws
- Always returns valid string (AI or fallback)
- Bot continues operating even if Gemini is down

## Data Flow

```
1. Bot determines concert needs cancellation
   ↓
2. BlueskyClient.postCancellation(concert) called
   ↓
3. excuseGenerator.generateExcuse(concert) called
   ↓
4. buildPrompt(concert) → string prompt
   ↓
5. generateWithGemini(concert, attempt=1)
   ├─ Success → return excuse
   └─ Failure → wait 1 minute
       ↓
6. generateWithGemini(concert, attempt=2)
   ├─ Success → return excuse
   └─ Failure → return getFallbackMessage(concert)
   ↓
7. Return excuse string to BlueskyClient
   ↓
8. BlueskyClient posts to Bluesky
   ↓
9. Update concert.cancelPostId in state
```

## File Changes Summary

### New Files

- `src/excuseGenerator.ts` - AI excuse generation module
- `src/__tests__/excuseGenerator.test.ts` - Test coverage

### Modified Files

- `src/blueskyClient.ts` - Use excuse generator
- `src/__tests__/blueskyClient.test.ts` - Update mocks
- `.env.example` - Add Gemini API key
- `package.json` - Add ai dependencies
- `README.md` - Document Gemini setup

### Unchanged Files

- `src/index.ts` - Main orchestrator
- `src/concertGenerator.ts` - Concert generation
- `src/scheduler.ts` - Scheduling logic
- `src/storage.ts` - State persistence
- All other test files

## Implementation Checklist

- [ ] Install `ai` and `@ai-sdk/google` packages
- [ ] Create `src/excuseGenerator.ts` with retry logic
- [ ] Implement `buildPrompt()` function
- [ ] Implement `generateWithGemini()` with error handling
- [ ] Implement `getFallbackMessage()` function
- [ ] Modify `src/blueskyClient.ts` to use excuse generator
- [ ] Update `.env.example` with Gemini API key
- [ ] Create `src/__tests__/excuseGenerator.test.ts`
- [ ] Update `src/__tests__/blueskyClient.test.ts` mocks
- [ ] Run full test suite, verify all pass
- [ ] Update README.md with Gemini setup instructions
- [ ] Manual test with real API key
- [ ] Manual test with missing API key (fallback)
- [ ] Verify logs show appropriate messages
- [ ] Commit changes

## Future Enhancements (Out of Scope)

- Multiple AI provider support (Anthropic, OpenAI)
- User-configurable excuse styles via config
- Caching/reusing previously generated excuses
- Excuse history tracking in state
- A/B testing different prompt templates
- Rate limiting awareness (track API usage)
- Generate weekly announcement messages with AI
- Multi-language excuse generation

## Success Criteria

1. ✅ AI-generated excuses post successfully to Bluesky
2. ✅ Excuses blend Morrissey drama, health, and absurdism
3. ✅ Venue and date always included in message
4. ✅ Messages stay under 280 characters
5. ✅ Retry logic works (1-minute delay between attempts)
6. ✅ Fallback message used when Gemini fails
7. ✅ All tests pass (75+ existing + 6 new)
8. ✅ No breaking changes to existing functionality
9. ✅ Bot remains operational even if Gemini is down
10. ✅ Clear logging for debugging and monitoring
