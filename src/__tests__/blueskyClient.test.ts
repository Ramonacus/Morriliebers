// Mock @atproto/api at top level
vi.mock('@atproto/api');

// Mock excuse generator
vi.mock('../excuseGenerator.js', () => ({
  generateExcuse: vi.fn().mockResolvedValue('Mocked excuse message')
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { BlueskyClient } from '../blueskyClient.js';
import { createMockConcert, createMockTour } from './fixtures.js';
import { generateExcuse } from '../excuseGenerator.js';
import { Continent } from '../types.js';

describe('BlueskyClient', () => {
  let mockAgent: Pick<BskyAgent, 'login' | 'post' | 'upsertProfile'>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgent = {
      login: vi.fn(),
      post: vi.fn(),
      upsertProfile: vi.fn()
    };

    vi.mocked(BskyAgent).mockImplementation(() => mockAgent);
  });

  describe('authenticate', () => {
    it('successfully authenticates with valid credentials', async () => {
      mockAgent.login.mockResolvedValue({ success: true });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.authenticate();

      expect(mockAgent.login).toHaveBeenCalledWith({
        identifier: 'user.bsky.social',
        password: 'password'
      });
    });

    it('throws error on authentication failure', async () => {
      mockAgent.login.mockRejectedValue(new Error('Invalid credentials'));

      const client = new BlueskyClient('user.bsky.social', 'wrong');

      await expect(client.authenticate()).rejects.toThrow('Failed to authenticate with Bluesky');
    });

    it('handles network errors', async () => {
      mockAgent.login.mockRejectedValue(new Error('Network error'));

      const client = new BlueskyClient('user.bsky.social', 'password');

      await expect(client.authenticate()).rejects.toThrow('Failed to authenticate');
    });
  });

  describe('postWeeklyAnnouncement', () => {
    it('creates post with formatted concert list', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://post/123' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concerts = [
        createMockConcert({ id: '1', venue: { name: 'Sala But', city: 'Madrid', continent: 'Europe' } }),
        createMockConcert({ id: '2', venue: { name: 'Razzmatazz', city: 'Barcelona', continent: 'Europe' } })
      ];

      const result = await client.postWeeklyAnnouncement(concerts);

      expect(result).toBe('at://post/123');
      expect(mockAgent.post).toHaveBeenCalledWith({
        text: expect.stringContaining('Sala But'),
        createdAt: expect.any(String)
      });
    });

    it('includes all concerts in post text', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://post/456' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concerts = [
        createMockConcert({ venue: { name: 'Venue 1', city: 'City 1', continent: 'Europe' } }),
        createMockConcert({ venue: { name: 'Venue 2', city: 'City 2', continent: 'Europe' } }),
        createMockConcert({ venue: { name: 'Venue 3', city: 'City 3', continent: 'Europe' } })
      ];

      await client.postWeeklyAnnouncement(concerts);

      const postCall = mockAgent.post.mock.calls[0][0];
      expect(postCall.text).toContain('Venue 1');
      expect(postCall.text).toContain('Venue 2');
      expect(postCall.text).toContain('Venue 3');
    });
  });

  describe('postCancellation', () => {
    it('creates cancellation post for single concert', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://cancel/123' });

      const client = new BlueskyClient('user.bsky.social', 'password');
      const concert = createMockConcert({ venue: { name: 'Test Venue', city: 'Test City', continent: 'Europe' } });

      const result = await client.postCancellation(concert);

      expect(result).toBe('at://cancel/123');
      expect(generateExcuse).toHaveBeenCalledWith(concert);
      expect(mockAgent.post).toHaveBeenCalledWith({
        text: 'Mocked excuse message',
        createdAt: expect.any(String)
      });
    });
  });

  describe('postTourAnnouncement', () => {
    it('posts overview and returns post URIs', async () => {
      // Mock post responses
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://tour/overview/123' }) // Overview
        .mockResolvedValueOnce({ uri: 'at://tour/week1/456' })   // Week 1
        .mockResolvedValueOnce({ uri: 'at://tour/week2/789' });  // Week 2

      const client = new BlueskyClient('user.bsky.social', 'password');

      const tour = createMockTour({
        continent: Continent.Europe,
        startDate: new Date('2026-03-15T20:00:00Z'),
        endDate: new Date('2026-03-29T22:00:00Z'),
        concerts: [
          createMockConcert({
            weekInTour: 1,
            date: new Date('2026-03-15T20:00:00Z')
          }),
          createMockConcert({
            weekInTour: 1,
            date: new Date('2026-03-17T21:00:00Z')
          }),
          createMockConcert({
            weekInTour: 2,
            date: new Date('2026-03-22T20:00:00Z')
          })
        ]
      });

      const result = await client.postTourAnnouncement(tour);

      expect(result.overviewPostId).toBe('at://tour/overview/123');
      expect(result.weeklyPostIds).toEqual(['at://tour/week1/456', 'at://tour/week2/789']);
      expect(mockAgent.post).toHaveBeenCalledTimes(3);
    });

    it('overview post includes continent and date range', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://tour/overview/123' })
        .mockResolvedValueOnce({ uri: 'at://tour/week1/456' });

      const client = new BlueskyClient('user.bsky.social', 'password');

      const tour = createMockTour({
        continent: Continent.Asia,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T23:59:59Z'),
        concerts: [
          createMockConcert({ weekInTour: 1 })
        ]
      });

      await client.postTourAnnouncement(tour);

      const overviewCall = mockAgent.post.mock.calls[0][0];
      expect(overviewCall.text).toContain('Asia');
      expect(overviewCall.text).toContain('🌍');
      expect(overviewCall.text).toContain('🎸');
    });

    it('weekly posts are replies to overview', async () => {
      const overviewUri = 'at://tour/overview/123';
      mockAgent.post
        .mockResolvedValueOnce({ uri: overviewUri })
        .mockResolvedValueOnce({ uri: 'at://tour/week1/456' })
        .mockResolvedValueOnce({ uri: 'at://tour/week2/789' });

      const client = new BlueskyClient('user.bsky.social', 'password');

      const tour = createMockTour({
        concerts: [
          createMockConcert({ weekInTour: 1 }),
          createMockConcert({ weekInTour: 2 })
        ]
      });

      await client.postTourAnnouncement(tour);

      // Check week 1 post has reply structure
      const week1Call = mockAgent.post.mock.calls[1][0];
      expect(week1Call.reply).toBeDefined();
      expect(week1Call.reply.root.uri).toBe(overviewUri);
      expect(week1Call.reply.parent.uri).toBe(overviewUri);

      // Check week 2 post has reply structure
      const week2Call = mockAgent.post.mock.calls[2][0];
      expect(week2Call.reply).toBeDefined();
      expect(week2Call.reply.root.uri).toBe(overviewUri);
      expect(week2Call.reply.parent.uri).toBe(overviewUri);
    });

    it('groups concerts by week in reply posts', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://tour/overview/123' })
        .mockResolvedValueOnce({ uri: 'at://tour/week1/456' })
        .mockResolvedValueOnce({ uri: 'at://tour/week2/789' });

      const client = new BlueskyClient('user.bsky.social', 'password');

      const tour = createMockTour({
        concerts: [
          createMockConcert({
            weekInTour: 1,
            venue: { name: 'Venue A', city: 'City A', continent: Continent.Europe }
          }),
          createMockConcert({
            weekInTour: 1,
            venue: { name: 'Venue B', city: 'City B', continent: Continent.Europe }
          }),
          createMockConcert({
            weekInTour: 2,
            venue: { name: 'Venue C', city: 'City C', continent: Continent.Europe }
          })
        ]
      });

      await client.postTourAnnouncement(tour);

      const week1Call = mockAgent.post.mock.calls[1][0];
      expect(week1Call.text).toContain('Venue A');
      expect(week1Call.text).toContain('Venue B');
      expect(week1Call.text).not.toContain('Venue C');

      const week2Call = mockAgent.post.mock.calls[2][0];
      expect(week2Call.text).toContain('Venue C');
      expect(week2Call.text).not.toContain('Venue A');
    });
  });
});
