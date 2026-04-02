import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlueskyClient, ThreadCreationError } from '../BlueskyClient.js';
import { BskyAgent } from '@atproto/api';

// Mock BskyAgent
vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn()
}));

describe('BlueskyClient', () => {
  let mockAgent: any;
  let client: BlueskyClient;

  beforeEach(() => {
    mockAgent = {
      login: vi.fn(),
      post: vi.fn()
    };

    vi.mocked(BskyAgent).mockImplementation(() => mockAgent);
    client = new BlueskyClient('test-identifier', 'test-password');
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      mockAgent.login.mockResolvedValue({
        did: 'did:plc:test',
        handle: 'test.bsky.social',
        accessJwt: 'test-jwt',
        refreshJwt: 'test-refresh'
      });

      await client.authenticate();

      expect(mockAgent.login).toHaveBeenCalledWith({
        identifier: 'test-identifier',
        password: 'test-password'
      });
    });

    it('should throw error on authentication failure', async () => {
      mockAgent.login.mockRejectedValue(new Error('Auth failed'));

      await expect(client.authenticate()).rejects.toThrow('Failed to authenticate with Bluesky');
    });
  });

  describe('post', () => {
    it('should post a single message', async () => {
      mockAgent.post.mockResolvedValue({
        uri: 'at://post-uri-123',
        cid: 'cid-123'
      });

      const uri = await client.post('Test message');

      expect(uri).toBe('at://post-uri-123');
      expect(mockAgent.post).toHaveBeenCalledWith({
        text: 'Test message',
        createdAt: expect.any(String)
      });
    });

    it('should post with reply metadata', async () => {
      mockAgent.post.mockResolvedValue({
        uri: 'at://post-uri-123',
        cid: 'cid-123'
      });

      const reply = {
        root: { uri: 'at://root', cid: 'root-cid' },
        parent: { uri: 'at://parent', cid: 'parent-cid' }
      };

      await client.post('Reply message', reply);

      expect(mockAgent.post).toHaveBeenCalledWith({
        text: 'Reply message',
        createdAt: expect.any(String),
        reply
      });
    });

    it('should throw error on post failure', async () => {
      mockAgent.post.mockRejectedValue(new Error('Post failed'));

      await expect(client.post('Test')).rejects.toThrow('Post failed');
    });

    it('should throw error on invalid response structure (empty URI)', async () => {
      mockAgent.post.mockResolvedValue({
        uri: '', // Invalid: empty URI
        cid: 'cid-123'
      });

      await expect(client.post('Test')).rejects.toThrow();
    });

    it('should throw error on missing uri in response', async () => {
      mockAgent.post.mockResolvedValue({
        cid: 'cid-123'
        // Missing uri
      });

      await expect(client.post('Test')).rejects.toThrow();
    });

    it('should throw error on missing cid in response', async () => {
      mockAgent.post.mockResolvedValue({
        uri: 'at://post-uri-123'
        // Missing cid
      });

      await expect(client.post('Test')).rejects.toThrow();
    });
  });

  describe('createThread', () => {
    it('should create a thread with multiple posts', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://post-1', cid: 'cid-1' })
        .mockResolvedValueOnce({ uri: 'at://post-2', cid: 'cid-2' })
        .mockResolvedValueOnce({ uri: 'at://post-3', cid: 'cid-3' });

      const uris = await client.createThread(['First post', 'Second post', 'Third post']);

      expect(uris).toEqual(['at://post-1', 'at://post-2', 'at://post-3']);
      expect(mockAgent.post).toHaveBeenCalledTimes(3);

      // First post has no reply
      expect(mockAgent.post).toHaveBeenNthCalledWith(1, {
        text: 'First post'
      });

      // Second post replies to first
      expect(mockAgent.post).toHaveBeenNthCalledWith(2, {
        text: 'Second post',
        reply: {
          root: { uri: 'at://post-1', cid: 'cid-1' },
          parent: { uri: 'at://post-1', cid: 'cid-1' }
        }
      });

      // Third post replies to second, with first as root
      expect(mockAgent.post).toHaveBeenNthCalledWith(3, {
        text: 'Third post',
        reply: {
          root: { uri: 'at://post-1', cid: 'cid-1' },
          parent: { uri: 'at://post-2', cid: 'cid-2' }
        }
      });
    });

    it('should retry failed posts', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://post-1', cid: 'cid-1' })
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ uri: 'at://post-2', cid: 'cid-2' });

      const uris = await client.createThread(['First post', 'Second post']);

      expect(uris).toEqual(['at://post-1', 'at://post-2']);
      expect(mockAgent.post).toHaveBeenCalledTimes(3); // 1 + 2 (1 retry)
    }, 10000); // 10s timeout for retry delays

    it('should throw ThreadCreationError after max retries', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://post-1', cid: 'cid-1' })
        .mockRejectedValue(new Error('Persistent failure'));

      try {
        await client.createThread(['First post', 'Second post']);
        expect.fail('Should have thrown ThreadCreationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ThreadCreationError);
        const threadError = error as ThreadCreationError;
        expect(threadError.successfulPosts).toEqual(['at://post-1']);
        expect(threadError.failedAtIndex).toBe(1);
        expect(threadError.originalError.message).toBe('Persistent failure');
      }
    }, 60000); // 60s timeout for all retry attempts (1+2+4+8+16 = 31s)

    it('should handle empty thread', async () => {
      const uris = await client.createThread([]);

      expect(uris).toEqual([]);
      expect(mockAgent.post).not.toHaveBeenCalled();
    });

    it('should handle single post thread', async () => {
      mockAgent.post.mockResolvedValue({ uri: 'at://post-1', cid: 'cid-1' });

      const uris = await client.createThread(['Single post']);

      expect(uris).toEqual(['at://post-1']);
      expect(mockAgent.post).toHaveBeenCalledTimes(1);
      expect(mockAgent.post).toHaveBeenCalledWith({
        text: 'Single post'
      });
    });

    it('should throw ThreadCreationError on invalid post response in thread', async () => {
      mockAgent.post
        .mockResolvedValueOnce({ uri: 'at://post-1', cid: 'cid-1' })
        .mockResolvedValue({ uri: '', cid: 'cid-2' }); // Invalid: empty URI on all subsequent calls

      try {
        await client.createThread(['First post', 'Second post']);
        expect.fail('Should have thrown ThreadCreationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ThreadCreationError);
      }
    }, 60000); // 60s timeout for retries
  });

  describe('ThreadCreationError', () => {
    it('should construct with all properties', () => {
      const originalError = new Error('Original error');
      const error = new ThreadCreationError(
        'Failed to post',
        ['at://post-1', 'at://post-2'],
        2,
        originalError
      );

      expect(error.message).toBe('Failed to post');
      expect(error.successfulPosts).toEqual(['at://post-1', 'at://post-2']);
      expect(error.failedAtIndex).toBe(2);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('ThreadCreationError');
    });
  });
});
