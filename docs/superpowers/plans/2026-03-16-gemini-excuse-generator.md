# Gemini Excuse Generator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static concert cancellation messages with AI-generated excuses using Google Gemini that blend Morrissey-style drama, health reasons, and absurdist creativity.

**Architecture:** New `excuseGenerator.ts` module handles all AI logic (prompt construction, Gemini API calls, retry logic, fallback). `BlueskyClient.postCancellation()` simply calls `generateExcuse()` and posts the result. Clean separation of concerns - AI failures don't break posting logic.

**Tech Stack:** Vercel AI SDK (`ai`), Google Gemini provider (`@ai-sdk/google`), existing TypeScript/Vitest stack

**Related Spec:** `docs/superpowers/specs/2026-03-16-gemini-excuse-generator-design.md`

---

## Chunk 1: Dependencies and Configuration

### Task 1: Install AI Dependencies

**Files:**
- Modify: `package.json` (dependencies section)

- [ ] **Step 1: Install ai and @ai-sdk/google packages**

```bash
npm install ai @ai-sdk/google
```

Expected output: Packages installed, package.json and package-lock.json updated

- [ ] **Step 2: Verify installation**

```bash
npm list ai @ai-sdk/google
```

Expected output: Shows installed versions (ai@^3.x.x, @ai-sdk/google@^0.x.x)

- [ ] **Step 3: Commit dependency changes**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add ai and @ai-sdk/google dependencies

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update Environment Configuration

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add Gemini API key to .env.example**

Open `.env.example` and add after existing credentials:

```bash
# Bluesky Credentials
BLUESKY_IDENTIFIER=your-username.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

- [ ] **Step 2: Add Gemini API key to local .env**

Manually edit `.env` and add your actual Gemini API key from Google AI Studio:

```bash
# Add this line to .env:
GOOGLE_GENERATIVE_AI_API_KEY=your-actual-gemini-api-key-here
```

- [ ] **Step 3: Verify .env file has new variable**

```bash
grep GOOGLE_GENERATIVE_AI_API_KEY .env
```

Expected: Shows the line with your API key

- [ ] **Step 4: Commit .env.example changes**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
config: add Google Gemini API key to environment template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2: Excuse Generator Module (TDD)

### Task 3: Create Excuse Generator Test File

**Files:**
- Create: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Create test file with imports and setup**

Create `src/__tests__/excuseGenerator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateExcuse } from '../excuseGenerator.js';
import { createMockConcert } from './fixtures.js';
import type { Concert } from '../types.js';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock the @ai-sdk/google module
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model: string) => ({ model })),
}));

describe('ExcuseGenerator', () => {
  let mockConcert: Concert;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConcert = createMockConcert({
      venue: { name: 'Sala But', city: 'Madrid' },
      date: new Date('2026-03-20T20:00:00'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Tests will go here
});
```

- [ ] **Step 2: Commit test file setup**

```bash
git add src/__tests__/excuseGenerator.test.ts
git commit -m "$(cat <<'EOF'
test: add excuse generator test file setup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Test 1 - Successful Generation on First Attempt

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Write failing test for successful generation**

Add inside `describe('ExcuseGenerator', () => {`:

```typescript
  it('generates excuse successfully on first attempt', async () => {
    const mockExcuse = 'The oppressive weight of Madrid has rendered performance impossible.';

    const { generateText } = await import('ai');
    vi.mocked(generateText).mockResolvedValue({
      text: mockExcuse,
      finishReason: 'stop',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    } as any);

    const result = await generateExcuse(mockConcert);

    expect(result).toBe(mockExcuse);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ model: 'gemini-2.0-flash-exp' }),
        temperature: 1.0,
        maxTokens: 100,
      })
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: FAIL - "Cannot find module '../excuseGenerator.js'"

- [ ] **Step 3: Create minimal excuseGenerator.ts stub**

Create `src/excuseGenerator.ts`:

```typescript
import type { Concert } from './types.js';

export async function generateExcuse(concert: Concert): Promise<string> {
  throw new Error('Not implemented');
}
```

- [ ] **Step 4: Run test to verify it still fails**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: FAIL - "Not implemented"

- [ ] **Step 5: Implement minimal code for successful generation**

Update `src/excuseGenerator.ts` with just enough to make Test 1 pass:

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Concert } from './types.js';

/**
 * Build prompt for Gemini to generate cancellation excuse
 */
function buildPrompt(concert: Concert): string {
  const dateStr = concert.date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });

  return `You are generating a creative cancellation excuse for a Morrissey tribute band called "Morriliebers".

Concert Details:
- Venue: ${concert.venue.name}
- City: ${concert.venue.city}
- Date: ${dateStr}

Style Guidelines:
- Mix of: dramatic/melancholic Morrissey-style, health-related, or absurdist
- MUST include the venue name, city, and date somewhere in the message
- Keep it brief: 1-2 sentences, under 280 characters
- Write the complete cancellation announcement (not just the excuse)
- Be creative with how you integrate the venue/date details

Example styles:
- Dramatic: "The existential weight of performing in ${concert.venue.city} has proven unbearable..."
- Health: "Vocal complications exacerbated by ${concert.venue.city}'s atmospheric conditions..."
- Absurdist: "An urgent matter involving vintage vinyl has made the ${dateStr} concert impossible..."

Generate a creative cancellation message now:`;
}

/**
 * Generate AI excuse for concert cancellation
 */
export async function generateExcuse(concert: Concert): Promise<string> {
  console.log(`[ExcuseGenerator] Generating excuse for ${concert.venue.name}`);

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    prompt: buildPrompt(concert),
    temperature: 1.0,
    maxTokens: 100,
  });

  console.log(`[ExcuseGenerator] Generated: ${result.text.substring(0, 50)}...`);
  return result.text;
}
```

Note: This is minimal - no retry logic or fallback yet. Those will be added incrementally as we write tests for them.

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (1 test passing)

- [ ] **Step 7: Commit test and minimal implementation**

```bash
git add src/__tests__/excuseGenerator.test.ts src/excuseGenerator.ts
git commit -m "$(cat <<'EOF'
feat: add excuse generator with Gemini integration

- Implement basic generateExcuse function
- Add buildPrompt function for Gemini prompts
- Add test for successful generation
- Retry logic and fallback to be added incrementally

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Test 2 - Retry Logic (First Fails, Second Succeeds)

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Write failing test for retry logic**

Add to test file:

```typescript
  it('retries on failure and succeeds on second attempt', async () => {
    const mockExcuse = 'Vocal strain necessitates rest. Sala But on 20/03 cannot proceed.';

    const { generateText } = await import('ai');
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        text: mockExcuse,
        finishReason: 'stop',
        usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
      } as any);

    // Mock setTimeout to avoid waiting 1 minute
    vi.useFakeTimers();

    const promiseResult = generateExcuse(mockConcert);

    // Fast-forward time by 1 minute
    await vi.advanceTimersByTimeAsync(60000);

    const result = await promiseResult;

    expect(result).toBe(mockExcuse);
    expect(generateText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: FAIL - Test expects retry but implementation doesn't have it yet

- [ ] **Step 3: Add retry logic to generateExcuse**

Update `src/excuseGenerator.ts`, modify the `generateExcuse` function:

```typescript
export async function generateExcuse(concert: Concert): Promise<string> {
  try {
    console.log(`[ExcuseGenerator] Attempt 1 - Generating excuse for ${concert.venue.name}`);

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: buildPrompt(concert),
      temperature: 1.0,
      maxTokens: 100,
    });

    console.log(`[ExcuseGenerator] Generated: ${result.text.substring(0, 50)}...`);
    return result.text;
  } catch (error) {
    console.error('[ExcuseGenerator] Attempt 1 failed:', error);
    console.log('[ExcuseGenerator] Retrying in 1 minute...');

    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    console.log(`[ExcuseGenerator] Attempt 2 - Generating excuse for ${concert.venue.name}`);

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: buildPrompt(concert),
      temperature: 1.0,
      maxTokens: 100,
    });

    console.log(`[ExcuseGenerator] Generated: ${result.text.substring(0, 50)}...`);
    return result.text;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (2 tests passing)

- [ ] **Step 5: Commit test and implementation**

```bash
git add src/__tests__/excuseGenerator.test.ts src/excuseGenerator.ts
git commit -m "$(cat <<'EOF'
feat: add retry logic to excuse generator

- Retry once after 1-minute delay on failure
- Add test for retry behavior

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Test 3 - Both Attempts Fail (Fallback)

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Write test for fallback message**

Add to test file:

```typescript
  it('uses fallback message when both attempts fail', async () => {
    const { generateText } = await import('ai');
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error again'));

    vi.useFakeTimers();

    const promiseResult = generateExcuse(mockConcert);
    await vi.advanceTimersByTimeAsync(60000);
    const result = await promiseResult;

    expect(result).toBe('Morriliebers regrets to announce the cancellation of the concert at Sala But on 03/20');
    expect(generateText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: FAIL - Second attempt throws but no fallback implemented

- [ ] **Step 3: Add fallback message function and catch second failure**

Update `src/excuseGenerator.ts`:

First, add the getFallbackMessage function before generateExcuse:

```typescript
/**
 * Get fallback static message
 */
function getFallbackMessage(concert: Concert): string {
  const dateStr = concert.date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });
  return `Morriliebers regrets to announce the cancellation of the concert at ${concert.venue.name} on ${dateStr}`;
}
```

Then wrap the second attempt in a try-catch in `generateExcuse`:

```typescript
  } catch (error) {
    console.error('[ExcuseGenerator] Attempt 1 failed:', error);
    console.log('[ExcuseGenerator] Retrying in 1 minute...');

    await new Promise(resolve => setTimeout(resolve, 60000));

    try {
      console.log(`[ExcuseGenerator] Attempt 2 - Generating excuse for ${concert.venue.name}`);

      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt: buildPrompt(concert),
        temperature: 1.0,
        maxTokens: 100,
      });

      console.log(`[ExcuseGenerator] Generated: ${result.text.substring(0, 50)}...`);
      return result.text;
    } catch (error2) {
      console.error('[ExcuseGenerator] Attempt 2 failed:', error2);
      console.log('[ExcuseGenerator] Using fallback message');
      return getFallbackMessage(concert);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit test and implementation**

```bash
git add src/__tests__/excuseGenerator.test.ts src/excuseGenerator.ts
git commit -m "$(cat <<'EOF'
feat: add fallback message when both Gemini attempts fail

- Add getFallbackMessage function
- Catch second attempt failure and return fallback
- Add test for fallback scenario

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Test 4 - Prompt Construction

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Write test for prompt content**

Add to test file:

```typescript
  it('includes venue, city, and date in prompt', async () => {
    const mockExcuse = 'Test excuse';

    const { generateText } = await import('ai');
    vi.mocked(generateText).mockResolvedValue({
      text: mockExcuse,
      finishReason: 'stop',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    } as any);

    await generateExcuse(mockConcert);

    const callArgs = vi.mocked(generateText).mock.calls[0][0];
    expect(callArgs.prompt).toContain('Sala But');
    expect(callArgs.prompt).toContain('Madrid');
    expect(callArgs.prompt).toContain('03/20');
  });
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (4 tests passing)

- [ ] **Step 3: Commit test**

```bash
git add src/__tests__/excuseGenerator.test.ts
git commit -m "$(cat <<'EOF'
test: verify prompt includes venue, city, and date

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Test 5 - Missing API Key

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`
- Modify: `src/excuseGenerator.ts`

- [ ] **Step 1: Write test for missing API key**

Add to test file:

```typescript
  it('uses fallback immediately when API key is missing', async () => {
    // Mock missing API key
    const originalEnv = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const result = await generateExcuse(mockConcert);

    expect(result).toBe('Morriliebers regrets to announce the cancellation of the concert at Sala But on 03/20');

    // Restore env
    if (originalEnv) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalEnv;
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: FAIL - Test tries to call Gemini even with missing key

- [ ] **Step 3: Add API key check at start of generateExcuse**

Update `generateExcuse` function in `src/excuseGenerator.ts`, add check at the beginning:

```typescript
export async function generateExcuse(concert: Concert): Promise<string> {
  // Check if API key is available
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[ExcuseGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
    return getFallbackMessage(concert);
  }

  // Rest of existing implementation (try-catch with retry logic) stays the same
  try {
    console.log(`[ExcuseGenerator] Attempt 1 - Generating excuse for ${concert.venue.name}`);
    // ... existing code continues unchanged
  } catch (error) {
    // ... existing retry logic unchanged
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (5 tests passing)

- [ ] **Step 5: Commit changes**

```bash
git add src/__tests__/excuseGenerator.test.ts src/excuseGenerator.ts
git commit -m "$(cat <<'EOF'
feat: handle missing API key gracefully

- Check for API key before calling Gemini
- Use fallback immediately if missing
- Add test for missing API key scenario

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Test 6 - Model Configuration

**Files:**
- Modify: `src/__tests__/excuseGenerator.test.ts`

- [ ] **Step 1: Write test for model configuration**

Add to test file:

```typescript
  it('uses correct Gemini model configuration', async () => {
    const mockExcuse = 'Test excuse';

    const { generateText } = await import('ai');
    const { google } = await import('@ai-sdk/google');

    vi.mocked(generateText).mockResolvedValue({
      text: mockExcuse,
      finishReason: 'stop',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    } as any);

    await generateExcuse(mockConcert);

    expect(google).toHaveBeenCalledWith('gemini-2.0-flash-exp');

    const callArgs = vi.mocked(generateText).mock.calls[0][0];
    expect(callArgs.temperature).toBe(1.0);
    expect(callArgs.maxTokens).toBe(100);
  });
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- excuseGenerator.test.ts
```

Expected: PASS (6 tests passing)

- [ ] **Step 3: Commit test**

```bash
git add src/__tests__/excuseGenerator.test.ts
git commit -m "$(cat <<'EOF'
test: verify Gemini model configuration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 3: BlueskyClient Integration

### Task 10: Update BlueskyClient to Use Excuse Generator

**Files:**
- Modify: `src/blueskyClient.ts`
- Modify: `src/__tests__/blueskyClient.test.ts`

- [ ] **Step 1: Add mock for excuse generator in tests**

Update `src/__tests__/blueskyClient.test.ts`, add mock at the very top (before any imports):

```typescript
// Mock excuse generator
vi.mock('../excuseGenerator.js', () => ({
  generateExcuse: vi.fn(),
}));
```

Then in the imports section (after other imports from '../'), add:

```typescript
import { generateExcuse } from '../excuseGenerator.js';
```

- [ ] **Step 2: Update "creates cancellation post" test and verify existing tests**

Find the test "creates cancellation post for single concert" and update it:

```typescript
  it('creates cancellation post for single concert', async () => {
    const concert = createMockConcert({
      venue: { name: 'Sala But', city: 'Madrid' },
      date: new Date('2026-03-20T20:00:00'),
    });

    const mockExcuse = 'The weight of existence has made this performance impossible.';
    vi.mocked(generateExcuse).mockResolvedValue(mockExcuse);

    mockAgent.post.mockResolvedValue({ uri: 'at://cancel/123' });

    const uri = await client.postCancellation(concert);

    expect(generateExcuse).toHaveBeenCalledWith(concert);
    expect(mockAgent.post).toHaveBeenCalledWith({
      text: mockExcuse,
      createdAt: expect.any(String),
    });
    expect(uri).toBe('at://cancel/123');
  });
```

Set default mock behavior in beforeEach:

```typescript
beforeEach(() => {
  // ... existing setup ...

  // Default mock for generateExcuse
  vi.mocked(generateExcuse).mockResolvedValue('Mocked excuse');
});
```

- [ ] **Step 3: Verify mock setup doesn't break imports**

```bash
npm test -- blueskyClient.test.ts
```

Expected: Tests run (may have assertion failures but no import/syntax errors)

- [ ] **Step 4: Run specific cancellation test to verify it fails**

```bash
npm test -- blueskyClient.test.ts -t "creates cancellation post"
```

Expected: FAIL - generateExcuse not called in implementation

- [ ] **Step 5: Update BlueskyClient.postCancellation**

Update `src/blueskyClient.ts`:

First, add import after the existing imports from './types.js' (around line 3):
```typescript
import { generateExcuse } from './excuseGenerator.js';
```

Then modify the `postCancellation` method (currently at lines 84-105).
**Remove these lines (88-92):**
```typescript
const dateStr = concert.date.toLocaleDateString('en-US', {
  day: '2-digit',
  month: '2-digit',
});
const text = `Morriliebers regrets to announce the cancellation of the concert at ${concert.venue.name} on ${dateStr}`;
```

**Replace with:**
```typescript
const text = await generateExcuse(concert);
```

Final method should look like:
```typescript
  async postCancellation(concert: Concert): Promise<string> {
    try {
      console.log('[Bluesky] Posting cancellation...');

      const text = await generateExcuse(concert);

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log('[Bluesky] Cancellation posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post cancellation:', error);
      throw error;
    }
  }
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- blueskyClient.test.ts
```

Expected: PASS (8 tests passing)

- [ ] **Step 7: Run all tests to verify nothing broke**

```bash
npm test
```

Expected: All tests pass. Verify output shows 80+ passing tests (74 existing + 6 new excuse generator tests)

- [ ] **Step 8: Commit changes**

```bash
git add src/blueskyClient.ts src/__tests__/blueskyClient.test.ts
git commit -m "$(cat <<'EOF'
feat: integrate excuse generator into BlueskyClient

- Replace static message with generateExcuse call
- Update tests to mock excuse generator
- Remove date formatting from BlueskyClient

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 4: Documentation

### Task 11: Update README with Gemini Setup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Prerequisites section**

In `README.md`, find the Prerequisites section and update it:

```markdown
## Prerequisites

- Node.js 18+
- Bluesky account with app password
- Google Gemini API key (get from https://aistudio.google.com/app/apikey)
```

- [ ] **Step 2: Update Setup section**

In the Setup section, update step 2:

```markdown
2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Bluesky credentials and Gemini API key
   ```
```

- [ ] **Step 3: Add new Gemini API Key section**

After the "Get Bluesky app password" section, add:

```markdown
4. **Get Google Gemini API key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create or sign in to your Google account
   - Click "Create API Key"
   - Add it to `.env` as `GOOGLE_GENERATIVE_AI_API_KEY`
```

- [ ] **Step 4: Update Features section**

Update the Features section to reflect AI-generated excuses:

```markdown
## Features

- 📅 Generates 1-3 concerts per week for Spanish venues
- 📢 Posts weekly announcement every Monday (10:00-14:00)
- 📌 Pins announcements to profile
- 🤖 AI-generated cancellation excuses (Gemini)
- ❌ Cancels concerts 20-24 hours before showtime
- 🇬🇧 All messages in English
```

- [ ] **Step 5: Add AI Excuse Generator section**

Add new section after "How It Works":

```markdown
## AI-Generated Excuses

Cancellation messages are generated using Google Gemini AI (`gemini-2.0-flash-exp`) with:

- **Style variety:** Mix of Morrissey-style drama, health-related, and absurdist excuses
- **Personalization:** Each excuse includes the specific venue, city, and date
- **Reliability:** Retry logic with 1-minute delay, fallback to static message on failure
- **Examples:**
  - "The existential weight of performing in Madrid has proven unbearable..."
  - "Vocal complications exacerbated by Madrid's atmospheric conditions..."
  - "An urgent matter involving vintage vinyl has made the concert impossible..."

If the Gemini API is unavailable, the bot automatically falls back to:
> "Morriliebers regrets to announce the cancellation of the concert at {venue} on {date}"
```

- [ ] **Step 6: Update Dependencies section in README**

Add after the Project Structure section:

```markdown
## Dependencies

**Production:**
- `@atproto/api` - Bluesky API client
- `dotenv` - Environment variable management
- `ai` - Vercel AI SDK (for Gemini integration)
- `@ai-sdk/google` - Google Gemini provider

**Development:**
- `typescript` - TypeScript compiler
- `vitest` - Testing framework
- `tsx` - TypeScript execution
```

- [ ] **Step 7: Commit README changes**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: update README with Gemini setup and AI features

- Add Gemini API key to prerequisites
- Document AI excuse generation feature
- Add setup instructions for Google AI Studio
- Update features list
- Add dependencies section

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 5: Verification and Final Testing

### Task 12: Integration Testing

**Files:**
- None (manual testing)

- [ ] **Step 1: Verify all tests pass**

```bash
npm test
```

Expected: All 80+ tests passing

- [ ] **Step 2: Build the project**

```bash
npm run build
```

Expected: Successful TypeScript compilation to dist/

- [ ] **Step 3: Check for TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Manual test with real API (if key available)**

If you have a real Gemini API key:

```bash
# Set up test concert in state
npm run trigger:announce

# Wait a moment, then trigger cancellation
npm run trigger:cancel-next
```

Expected:
- Console logs show "[ExcuseGenerator] Attempt 1 - Generating excuse..."
- AI-generated excuse appears in logs
- If you check Bluesky, the post should have the AI excuse

- [ ] **Step 5: Test fallback (remove API key temporarily)**

```bash
# Temporarily rename API key in .env
sed -i.bak 's/GOOGLE_GENERATIVE_AI_API_KEY/GOOGLE_GENERATIVE_AI_API_KEY_DISABLED/' .env

# Try cancellation
npm run trigger:cancel-next
```

Expected:
- Console shows warning about missing API key
- Fallback message is used
- Bot still posts successfully

```bash
# Restore API key
mv .env.bak .env
```

---

### Task 13: Final Review and Documentation Check

**Files:**
- None (verification)

- [ ] **Step 1: Verify all files committed**

```bash
git status
```

Expected: Working tree clean, no uncommitted changes

- [ ] **Step 2: Review commit history**

```bash
git log --oneline -10
```

Expected: Clear commit messages for all changes

- [ ] **Step 3: Verify spec and plan exist**

```bash
ls -la docs/superpowers/specs/2026-03-16-gemini-excuse-generator-design.md
ls -la docs/superpowers/plans/2026-03-16-gemini-excuse-generator.md
```

Expected: Both files exist

- [ ] **Step 4: Run final test suite**

```bash
npm test
```

Expected: All tests passing

- [ ] **Step 5: Create final summary commit (if needed)**

If there are any remaining uncommitted changes:

```bash
git add .
git commit -m "chore: finalize Gemini excuse generator implementation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Implementation Complete! 🎉

**What was built:**
- ✅ New `excuseGenerator.ts` module with Gemini integration
- ✅ Retry logic with 1-minute delay and fallback
- ✅ 6 comprehensive tests for excuse generator
- ✅ BlueskyClient integration with updated tests
- ✅ Environment configuration for Gemini API key
- ✅ Complete documentation in README

**Test Coverage:**
- Before: 74 tests passing
- After: 80+ tests passing
- New module: 6 tests covering all scenarios

**Next Steps:**
1. Deploy with real Gemini API key
2. Monitor logs for AI generation success rate
3. Collect examples of generated excuses
4. Consider adding excuse history tracking (future enhancement)

**Verification Checklist:**
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Manual test with real API key successful
- [ ] Fallback works when API key missing
- [ ] Documentation complete and accurate
- [ ] Git history clean with clear commits
