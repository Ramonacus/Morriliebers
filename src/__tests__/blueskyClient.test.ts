// Mock @atproto/api at top level
vi.mock('@atproto/api');

// Mock excuse generator
vi.mock('../excuseGenerator.js', () => ({
  generateExcuse: vi.fn().mockResolvedValue('Mocked excuse message')
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { BlueskyClient } from '../blueskyClient.js';
import { createMockConcert } from './fixtures.js';
import { generateExcuse } from '../excuseGenerator.js';

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
        createMockConcert({ id: '1', venue: { name: 'Sala But', city: 'Madrid' } }),
        createMockConcert({ id: '2', venue: { name: 'Razzmatazz', city: 'Barcelona' } })
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
        createMockConcert({ venue: { name: 'Venue 1', city: 'City 1' } }),
        createMockConcert({ venue: { name: 'Venue 2', city: 'City 2' } }),
        createMockConcert({ venue: { name: 'Venue 3', city: 'City 3' } })
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
      const concert = createMockConcert({ venue: { name: 'Test Venue', city: 'Test City' } });

      const result = await client.postCancellation(concert);

      expect(result).toBe('at://cancel/123');
      expect(generateExcuse).toHaveBeenCalledWith(concert);
      expect(mockAgent.post).toHaveBeenCalledWith({
        text: 'Mocked excuse message',
        createdAt: expect.any(String)
      });
    });
  });

  describe('pin/unpin functionality', () => {
    it('pins a post successfully', async () => {
      mockAgent.upsertProfile.mockImplementation((callback) => {
        const profile = { displayName: 'Test', description: 'Bio', pinnedPost: undefined };
        const updated = callback(profile);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.pinPost('at://post/123');

      expect(mockAgent.upsertProfile).toHaveBeenCalled();
      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({ displayName: 'Test', description: 'Bio' });
      expect(result.pinnedPost).toBe('at://post/123');
    });

    it('unpins current post', async () => {
      mockAgent.upsertProfile.mockImplementation((callback) => {
        const profile = { displayName: 'Test', description: 'Bio', pinnedPost: 'at://post/123' };
        const updated = callback(profile);
        return Promise.resolve(updated);
      });

      const client = new BlueskyClient('user.bsky.social', 'password');
      await client.unpinPost();

      expect(mockAgent.upsertProfile).toHaveBeenCalled();
      const callback = mockAgent.upsertProfile.mock.calls[0][0];
      const result = callback({ displayName: 'Test', description: 'Bio', pinnedPost: 'at://old/123' });
      expect(result.pinnedPost).toBeUndefined();
    });
  });
});
