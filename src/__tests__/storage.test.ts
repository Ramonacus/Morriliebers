// Mock fs modules at top level (before imports)
vi.mock('fs');
vi.mock('fs/promises');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { loadState, saveState } from '../storage.js';
import { createMockState, createMockConcert } from './fixtures.js';
import { setupFileSystemMocks } from './helpers.js';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serialization round-trip', () => {
    it('preserves all concert data through save and load', async () => {
      const originalState = createMockState({
        concerts: [
          createMockConcert({
            id: '1',
            date: new Date('2026-03-15T20:00:00Z'),
            announcementDate: new Date('2026-03-10T12:00:00Z'),
            cancellationDate: new Date('2026-03-14T22:00:00Z'),
            postId: 'post-123',
            cancelPostId: 'cancel-456',
            isPinned: true,
            isCanceled: false
          })
        ],
        lastAnnouncementDate: new Date('2026-03-10T12:00:00Z'),
        weeklyPostId: 'weekly-789'
      });

      let savedData: string = '';

      // Setup mocks
      const mocks = setupFileSystemMocks({ fileExists: true });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedData = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockImplementation(() => Promise.resolve(savedData));

      // Save and load
      await saveState(originalState);
      const loadedState = await loadState();

      // Verify all data preserved
      expect(loadedState.concerts).toHaveLength(1);
      expect(loadedState.concerts[0].id).toBe('1');
      // Venue object preserved
      expect(loadedState.concerts[0].venue).toEqual(originalState.concerts[0].venue);
      // Dates converted from ISO strings to Date objects
      expect(loadedState.concerts[0].date.toISOString()).toBe('2026-03-15T20:00:00.000Z');
      expect(loadedState.concerts[0].announcementDate.toISOString()).toBe('2026-03-10T12:00:00.000Z');
      expect(loadedState.concerts[0].cancellationDate?.toISOString()).toBe('2026-03-14T22:00:00.000Z');
      // Other properties preserved
      expect(loadedState.concerts[0].postId).toBe('post-123');
      expect(loadedState.concerts[0].cancelPostId).toBe('cancel-456');
      expect(loadedState.concerts[0].isPinned).toBe(true);
      expect(loadedState.concerts[0].isCanceled).toBe(false);
      expect(loadedState.lastAnnouncementDate?.toISOString()).toBe('2026-03-10T12:00:00.000Z');
      expect(loadedState.weeklyPostId).toBe('weekly-789');
    });

    it('handles missing optional fields', async () => {
      const originalState = createMockState({
        concerts: [
          createMockConcert({
            id: '1',
            cancellationDate: undefined,
            postId: undefined,
            cancelPostId: undefined
          })
        ],
        lastAnnouncementDate: undefined,
        weeklyPostId: undefined
      });

      let savedData: string = '';

      const mocks = setupFileSystemMocks({ fileExists: true });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedData = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockImplementation(() => Promise.resolve(savedData));

      await saveState(originalState);
      const loadedState = await loadState();

      expect(loadedState.concerts[0].cancellationDate).toBeUndefined();
      expect(loadedState.concerts[0].postId).toBeUndefined();
      expect(loadedState.concerts[0].cancelPostId).toBeUndefined();
      expect(loadedState.lastAnnouncementDate).toBeUndefined();
      expect(loadedState.weeklyPostId).toBeUndefined();
    });
  });
});
