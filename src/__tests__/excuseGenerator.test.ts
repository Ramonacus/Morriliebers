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
});
