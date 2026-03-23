import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAnnouncement } from '../announcementGenerator.js';
import type { Tour } from '../types.js';
import { createMockTour } from './fixtures.js';

describe('announcementGenerator', () => {
  describe('getFallbackMessage', () => {
    it('should format fallback message with tour details', async () => {
      // Remove API key to force fallback
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const tour = createMockTour({
        continent: 'Europe',
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
});
