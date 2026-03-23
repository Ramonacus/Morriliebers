import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAnnouncement } from '../announcementGenerator.js';
import { generateText } from 'ai';
import type { Tour } from '../types.js';
import { createMockTour, createMockConcert } from './fixtures.js';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

describe('announcementGenerator', () => {
  describe('getFallbackMessage', () => {
    it('should format fallback message with tour details', async () => {
      // Remove API key to force fallback
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const tour = createMockTour({
        continent: 'Europe' as any,
        startDate: new Date('2026-04-15'),
        endDate: new Date('2026-05-05'),
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
      const tour = createMockTour({
        continent: 'Asia' as any,
        concerts: Array(6).fill(null).map((_, i) => createMockConcert({
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
      expect(vi.mocked(generateText)).toHaveBeenCalledTimes(1);
    });

    it('should retry after 1 minute if first attempt fails', async () => {
      const tour = createMockTour({ continent: 'South America' as any });

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

    it('should return fallback after both attempts fail', async () => {
      const tour = createMockTour({
        continent: 'North America' as any,
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
  });
});
