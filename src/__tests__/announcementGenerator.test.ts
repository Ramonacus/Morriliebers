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
  });
});
