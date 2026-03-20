// Mock modules at top level
vi.mock('../../blueskyClient.js');
vi.mock('../../storage.js');

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { BlueskyClient } from '../../blueskyClient.js';
import { loadState, saveState } from '../../storage.js';
import { initializeClient, loadAndValidateState, saveAndExit } from '../../scripts/utils.js';
import { createMockState } from '../fixtures.js';

describe('Script Utils', () => {
  let exitSpy: MockInstance<typeof process.exit>;
  let consoleLogSpy: MockInstance<typeof console.log>;
  let consoleErrorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set environment variables
    process.env.BLUESKY_IDENTIFIER = 'test.bsky.social';
    process.env.BLUESKY_APP_PASSWORD = 'test-password';
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('initializeClient', () => {
    it('creates and authenticates a BlueskyClient with env credentials', async () => {
      const mockClient = {
        authenticate: vi.fn().mockResolvedValue(undefined)
      } as unknown as BlueskyClient;
      vi.mocked(BlueskyClient).mockImplementation(() => mockClient);

      const client = await initializeClient();

      expect(BlueskyClient).toHaveBeenCalledWith('test.bsky.social', 'test-password');
      expect(mockClient.authenticate).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('exits with error if BLUESKY_IDENTIFIER is missing', async () => {
      delete process.env.BLUESKY_IDENTIFIER;

      await expect(async () => {
        await initializeClient();
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('BLUESKY_IDENTIFIER')
      );
    });

    it('exits with error if BLUESKY_APP_PASSWORD is missing', async () => {
      delete process.env.BLUESKY_APP_PASSWORD;

      await expect(async () => {
        await initializeClient();
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('BLUESKY_APP_PASSWORD')
      );
    });

    it('exits with error if authentication fails', async () => {
      const mockClient = {
        authenticate: vi.fn().mockRejectedValue(new Error('Auth failed'))
      } as unknown as BlueskyClient;
      vi.mocked(BlueskyClient).mockImplementation(() => mockClient);

      await expect(async () => {
        await initializeClient();
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to authenticate')
      );
    });
  });

  describe('loadAndValidateState', () => {
    it('loads and returns state successfully', async () => {
      const mockState = createMockState({ concerts: [] });
      vi.mocked(loadState).mockResolvedValue(mockState);

      const state = await loadAndValidateState();

      expect(loadState).toHaveBeenCalled();
      expect(state).toBe(mockState);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded state')
      );
    });

    it('exits with error if state loading fails', async () => {
      vi.mocked(loadState).mockRejectedValue(new Error('File not found'));

      await expect(async () => {
        await loadAndValidateState();
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load state')
      );
    });
  });

  describe('saveAndExit', () => {
    it('saves state and exits with success code', async () => {
      const mockState = createMockState();
      vi.mocked(saveState).mockResolvedValue();

      await expect(async () => {
        await saveAndExit(mockState, 0);
      }).rejects.toThrow('process.exit(0)');

      expect(saveState).toHaveBeenCalledWith(mockState);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('State saved')
      );
    });

    it('saves state and exits with error code', async () => {
      const mockState = createMockState();
      vi.mocked(saveState).mockResolvedValue();

      await expect(async () => {
        await saveAndExit(mockState, 1);
      }).rejects.toThrow('process.exit(1)');

      expect(saveState).toHaveBeenCalledWith(mockState);
    });

    it('exits with error if save fails', async () => {
      const mockState = createMockState();
      vi.mocked(saveState).mockRejectedValue(new Error('Write failed'));

      await expect(async () => {
        await saveAndExit(mockState, 0);
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save state')
      );
    });
  });
});
