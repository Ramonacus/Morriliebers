import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Concert } from '../Concert.js';
import { Continent } from '../../types.js';
import type { Venue } from '../../types.js';
import * as ai from 'ai';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn()
}));

describe('Concert', () => {
  const mockVenue: Venue = {
    name: 'Madison Square Garden',
    city: 'New York',
    continent: Continent.NorthAmerica,
    capacity: '20000'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('construction', () => {
    it('should create a concert with all required properties', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      expect(concert.id).toBe('concert-1');
      expect(concert.venue).toEqual(mockVenue);
      expect(concert.date).toEqual(new Date('2026-04-01T20:00:00Z'));
      expect(concert.cancellationDate).toEqual(new Date('2026-03-31T20:00:00Z'));
      expect(concert.weekInTour).toBe(1);
      expect(concert.isCanceled).toBe(false);
      expect(concert.cancelPostId).toBeUndefined();
    });

    it('should create a canceled concert', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true,
        cancelPostId: 'at://cancel-post-123'
      });

      expect(concert.isCanceled).toBe(true);
      expect(concert.cancelPostId).toBe('at://cancel-post-123');
    });
  });

  describe('shouldCancelNow', () => {
    it('should return true when cancellation time has passed', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const now = new Date('2026-03-31T21:00:00Z');
      expect(concert.shouldCancelNow(now)).toBe(true);
    });

    it('should return true when exactly at cancellation time', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const now = new Date('2026-03-31T20:00:00Z');
      expect(concert.shouldCancelNow(now)).toBe(true);
    });

    it('should return false when before cancellation time', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const now = new Date('2026-03-31T19:00:00Z');
      expect(concert.shouldCancelNow(now)).toBe(false);
    });

    it('should return false if already canceled', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true
      });

      const now = new Date('2026-03-31T21:00:00Z');
      expect(concert.shouldCancelNow(now)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true for non-canceled concert', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      expect(concert.isActive()).toBe(true);
    });

    it('should return false for canceled concert', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true
      });

      expect(concert.isActive()).toBe(false);
    });
  });

  describe('markCanceled', () => {
    it('should mark concert as canceled with post ID', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      expect(concert.isCanceled).toBe(false);
      expect(concert.cancelPostId).toBeUndefined();

      concert.markCanceled('at://cancel-post-123');

      expect(concert.isCanceled).toBe(true);
      expect(concert.cancelPostId).toBe('at://cancel-post-123');
    });
  });

  describe('cancel', () => {
    it('should generate excuse and post via client', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      // Set API key to enable LLM path
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';

      // Mock LLM API
      vi.mocked(ai.generateText).mockResolvedValue({
        text: 'The existential weight of performing in New York has proven unbearable. Concert at Madison Square Garden on 04/01 canceled.',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });

      const mockClient = {
        post: vi.fn().mockResolvedValue('at://cancel-post-123')
      };

      await concert.cancel(mockClient as any);

      expect(mockClient.post).toHaveBeenCalledOnce();
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('existential weight')
      );
      expect(concert.isCanceled).toBe(true);
      expect(concert.cancelPostId).toBe('at://cancel-post-123');

      // Restore API key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      } else {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
    });

    it('should throw error when already canceled', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true
      });

      const mockClient = {
        post: vi.fn()
      };

      await expect(concert.cancel(mockClient as any)).rejects.toThrow('Concert is already canceled');
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should use fallback message when API key not set', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      // Clear API key
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const mockClient = {
        post: vi.fn().mockResolvedValue('at://cancel-post-123')
      };

      await concert.cancel(mockClient as any);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('Morriliebers regrets to announce')
      );
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('Madison Square Garden')
      );

      // Restore API key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      }
    });

    it('should retry on LLM failure and eventually succeed', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      // Set API key to enable LLM path
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';

      // Mock: first attempt fails, second succeeds
      vi.mocked(ai.generateText)
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockResolvedValueOnce({
          text: 'Concert canceled due to unforeseen circumstances.',
          finishReason: 'stop',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
        });

      const mockClient = {
        post: vi.fn().mockResolvedValue('at://cancel-post-123')
      };

      await concert.cancel(mockClient as any);

      expect(ai.generateText).toHaveBeenCalledTimes(2);
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('unforeseen circumstances')
      );

      // Restore API key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      } else {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
    }, 65000); // 65s timeout for 1 minute retry delay

    it('should use fallback after both LLM attempts fail', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      // Set API key to enable LLM path
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';

      // Mock: both attempts fail
      vi.mocked(ai.generateText).mockRejectedValue(new Error('API unavailable'));

      const mockClient = {
        post: vi.fn().mockResolvedValue('at://cancel-post-123')
      };

      await concert.cancel(mockClient as any);

      expect(ai.generateText).toHaveBeenCalledTimes(2);
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('Morriliebers regrets to announce')
      );

      // Restore API key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      } else {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
    }, 65000); // 65s timeout for retry delays

    it('should validate LLM response schema', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      // Set API key to enable LLM path
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';

      // Mock: invalid response (empty text)
      vi.mocked(ai.generateText)
        .mockResolvedValueOnce({
          text: '', // Invalid: empty text
          finishReason: 'stop'
        } as any)
        .mockResolvedValueOnce({
          text: 'Valid excuse message.',
          finishReason: 'stop',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
        });

      const mockClient = {
        post: vi.fn().mockResolvedValue('at://cancel-post-123')
      };

      await concert.cancel(mockClient as any);

      // Should retry after validation failure
      expect(ai.generateText).toHaveBeenCalledTimes(2);
      expect(mockClient.post).toHaveBeenCalledWith('Valid excuse message.');

      // Restore API key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      } else {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
    }, 65000);
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: false
      });

      const json = concert.toJSON();

      expect(json).toEqual({
        id: 'concert-1',
        venue: mockVenue,
        date: '2026-04-01T20:00:00.000Z',
        cancellationDate: '2026-03-31T20:00:00.000Z',
        weekInTour: 1,
        isCanceled: false
      });
    });

    it('should serialize canceled concert with post ID', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true,
        cancelPostId: 'at://cancel-post-123'
      });

      const json = concert.toJSON();

      expect(json).toEqual({
        id: 'concert-1',
        venue: mockVenue,
        date: '2026-04-01T20:00:00.000Z',
        cancellationDate: '2026-03-31T20:00:00.000Z',
        weekInTour: 1,
        isCanceled: true,
        cancelPostId: 'at://cancel-post-123'
      });
    });

    it('should omit cancelPostId when undefined', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const json = concert.toJSON();

      expect(json).not.toHaveProperty('cancelPostId');
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'concert-1',
        venue: mockVenue,
        date: '2026-04-01T20:00:00.000Z',
        cancellationDate: '2026-03-31T20:00:00.000Z',
        weekInTour: 1,
        isCanceled: false
      };

      const concert = Concert.fromJSON(json);

      expect(concert.id).toBe('concert-1');
      expect(concert.venue).toEqual(mockVenue);
      expect(concert.date).toEqual(new Date('2026-04-01T20:00:00Z'));
      expect(concert.cancellationDate).toEqual(new Date('2026-03-31T20:00:00Z'));
      expect(concert.weekInTour).toBe(1);
      expect(concert.isCanceled).toBe(false);
      expect(concert.cancelPostId).toBeUndefined();
    });

    it('should deserialize canceled concert with post ID', () => {
      const json = {
        id: 'concert-1',
        venue: mockVenue,
        date: '2026-04-01T20:00:00.000Z',
        cancellationDate: '2026-03-31T20:00:00.000Z',
        weekInTour: 1,
        isCanceled: true,
        cancelPostId: 'at://cancel-post-123'
      };

      const concert = Concert.fromJSON(json);

      expect(concert.isCanceled).toBe(true);
      expect(concert.cancelPostId).toBe('at://cancel-post-123');
    });

    it('should throw error on invalid date in fromJSON', () => {
      const json = {
        id: 'concert-1',
        venue: mockVenue,
        date: 'invalid-date',
        cancellationDate: '2026-03-31T20:00:00.000Z',
        weekInTour: 1,
        isCanceled: false
      };

      expect(() => Concert.fromJSON(json)).toThrow(
        'Concert.fromJSON: invalid date in data for id=concert-1'
      );
    });

    it('should throw error on invalid cancellation date in fromJSON', () => {
      const json = {
        id: 'concert-1',
        venue: mockVenue,
        date: '2026-04-01T20:00:00.000Z',
        cancellationDate: 'not-a-date',
        weekInTour: 1,
        isCanceled: false
      };

      expect(() => Concert.fromJSON(json)).toThrow(
        'Concert.fromJSON: invalid date in data for id=concert-1'
      );
    });

    it('should round-trip through serialization', () => {
      const original = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true,
        cancelPostId: 'at://cancel-post-123'
      });

      const json = original.toJSON();
      const deserialized = Concert.fromJSON(json);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.venue).toEqual(original.venue);
      expect(deserialized.date).toEqual(original.date);
      expect(deserialized.cancellationDate).toEqual(original.cancellationDate);
      expect(deserialized.weekInTour).toBe(original.weekInTour);
      expect(deserialized.isCanceled).toBe(original.isCanceled);
      expect(deserialized.cancelPostId).toBe(original.cancelPostId);
    });
  });
});
