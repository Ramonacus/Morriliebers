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
    // Set API key for tests that need it (will be removed in specific test)
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('retries once after first attempt fails', async () => {
    vi.useFakeTimers();

    const mockExcuse = 'Vocal strain necessitates rest.';
    const { generateText } = await import('ai');

    // First call fails, second succeeds
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce({
        text: mockExcuse,
        finishReason: 'stop',
        usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
      } as any);

    const promise = generateExcuse(mockConcert);

    // Fast-forward time by 1 minute
    await vi.advanceTimersByTimeAsync(60000);

    const result = await promise;

    expect(result).toBe(mockExcuse);
    expect(generateText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('uses fallback message when both attempts fail', async () => {
    vi.useFakeTimers();

    const { generateText } = await import('ai');

    // Both attempts fail
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('Network timeout'));

    const promise = generateExcuse(mockConcert);

    // Fast-forward time by 1 minute (for retry)
    await vi.advanceTimersByTimeAsync(60000);

    const result = await promise;

    // Should return fallback message with venue and date
    expect(result).toContain('Morriliebers');
    expect(result).toContain('Sala But');
    expect(result).toMatch(/\d{2}\/\d{2}/); // Date format MM/DD
    expect(generateText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

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

  it('uses fallback when API key is missing', async () => {
    // Temporarily remove API key
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const result = await generateExcuse(mockConcert);

    // Should use fallback message
    expect(result).toContain('Morriliebers');
    expect(result).toContain('Sala But');
    expect(result).toMatch(/\d{2}\/\d{2}/);

    // Restore API key
    if (originalKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    }
  });
});
