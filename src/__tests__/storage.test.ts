// Mock fs modules at top level (before imports)
vi.mock('fs');
vi.mock('fs/promises');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { loadState, saveState } from '../storage.js';
import { createMockState, createMockConcert, createMockTour } from './fixtures.js';
import { setupFileSystemMocks } from './helpers.js';
import { Continent } from '../types.js';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serialization round-trip', () => {
    it('preserves all tour and concert data through save and load', async () => {
      const originalState = createMockState({
        tours: [
          createMockTour({
            id: 'tour-1',
            continent: Continent.Europe,
            startDate: new Date('2026-03-15T20:00:00Z'),
            endDate: new Date('2026-03-29T22:00:00Z'),
            announcementDate: new Date('2026-03-10T12:00:00Z'),
            overviewPostId: 'overview-123',
            weeklyPostIds: ['week1-456', 'week2-789'],
            concerts: [
              createMockConcert({
                id: '1',
                date: new Date('2026-03-15T20:00:00Z'),
                cancellationDate: new Date('2026-03-14T22:00:00Z'),
                weekInTour: 1,
                cancelPostId: 'cancel-456',
                isCanceled: false
              })
            ]
          })
        ],
        lastTourGenerationDate: new Date('2026-03-10T12:00:00Z')
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

      // Verify tour data preserved
      expect(loadedState.tours).toHaveLength(1);
      expect(loadedState.tours[0].id).toBe('tour-1');
      expect(loadedState.tours[0].continent).toBe(Continent.Europe);
      expect(loadedState.tours[0].startDate).toBeInstanceOf(Date);
      expect(loadedState.tours[0].endDate).toBeInstanceOf(Date);
      expect(loadedState.tours[0].announcementDate).toBeInstanceOf(Date);
      expect(loadedState.tours[0].overviewPostId).toBe('overview-123');
      expect(loadedState.tours[0].weeklyPostIds).toEqual(['week1-456', 'week2-789']);

      // Verify concert data within tour preserved
      expect(loadedState.tours[0].concerts).toHaveLength(1);
      expect(loadedState.tours[0].concerts[0].id).toBe('1');
      expect(loadedState.tours[0].concerts[0].venue).toEqual(originalState.tours[0].concerts[0].venue);
      expect(loadedState.tours[0].concerts[0].date.toISOString()).toBe('2026-03-15T20:00:00.000Z');
      expect(loadedState.tours[0].concerts[0].cancellationDate.toISOString()).toBe('2026-03-14T22:00:00.000Z');
      expect(loadedState.tours[0].concerts[0].weekInTour).toBe(1);
      expect(loadedState.tours[0].concerts[0].cancelPostId).toBe('cancel-456');
      expect(loadedState.tours[0].concerts[0].isCanceled).toBe(false);

      // Verify state-level data preserved
      expect(loadedState.lastTourGenerationDate?.toISOString()).toBe('2026-03-10T12:00:00.000Z');
    });

    it('handles missing optional fields', async () => {
      const originalState = createMockState({
        tours: [
          createMockTour({
            id: 'tour-1',
            overviewPostId: undefined,
            concerts: [
              createMockConcert({
                id: '1',
                cancelPostId: undefined
              })
            ]
          })
        ],
        lastTourGenerationDate: undefined
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

      expect(loadedState.tours[0].overviewPostId).toBeUndefined();
      expect(loadedState.tours[0].concerts[0].cancelPostId).toBeUndefined();
      expect(loadedState.lastTourGenerationDate).toBeUndefined();
    });
  });

  describe('loadState', () => {
    it('creates data directory if missing', async () => {
      const mocks = setupFileSystemMocks({ fileExists: false });
      vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValueOnce(false);
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation(mocks.writeFile);
      vi.mocked(rename).mockImplementation(mocks.rename);
      vi.mocked(readFile).mockResolvedValue('{"tours":[]}');

      await loadState();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('returns empty state and saves it if file does not exist', async () => {
      const mocks = setupFileSystemMocks({ fileExists: false });
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // Directory exists
        .mockReturnValueOnce(false); // File doesn't exist
      vi.mocked(mkdir).mockImplementation(mocks.mkdir);
      vi.mocked(writeFile).mockImplementation(mocks.writeFile);
      vi.mocked(rename).mockImplementation(mocks.rename);

      const state = await loadState();

      expect(state.tours).toEqual([]);
      // Verify empty state was saved
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.stringContaining('tours'),
        'utf-8'
      );
    });

    it('successfully loads existing state file', async () => {
      const mockData = {
        tours: [
          {
            id: 'tour-1',
            continent: 'Europe',
            startDate: '2026-03-15T20:00:00.000Z',
            endDate: '2026-03-29T22:00:00.000Z',
            announcementDate: '2026-03-10T12:00:00.000Z',
            overviewPostId: 'overview-123',
            weeklyPostIds: ['week1-456'],
            concerts: [
              {
                id: '1',
                venue: { name: 'Test', city: 'City', continent: 'Europe' },
                date: '2026-03-15T20:00:00.000Z',
                cancellationDate: '2026-03-14T22:00:00.000Z',
                weekInTour: 1,
                isCanceled: false
              }
            ]
          }
        ],
        lastTourGenerationDate: '2026-03-10T12:00:00.000Z'
      };

      const mocks = setupFileSystemMocks({
        fileExists: true,
        fileContent: JSON.stringify(mockData)
      });
      vi.mocked(existsSync).mockImplementation(mocks.existsSync);
      vi.mocked(readFile).mockImplementation(mocks.readFile);

      const state = await loadState();

      expect(state.tours).toHaveLength(1);
      expect(state.tours[0].id).toBe('tour-1');
      expect(state.tours[0].continent).toBe('Europe');
      expect(state.tours[0].startDate).toBeInstanceOf(Date);
      expect(state.tours[0].endDate).toBeInstanceOf(Date);
      expect(state.tours[0].announcementDate).toBeInstanceOf(Date);
      expect(state.tours[0].concerts[0].id).toBe('1');
      expect(state.tours[0].concerts[0].venue.name).toBe('Test');
      expect(state.tours[0].concerts[0].venue.city).toBe('City');
      expect(state.tours[0].concerts[0].date).toBeInstanceOf(Date);
      expect(state.tours[0].concerts[0].cancellationDate).toBeInstanceOf(Date);
      expect(state.lastTourGenerationDate).toBeInstanceOf(Date);
    });

    it('handles corrupted JSON by creating backup and returning empty state', async () => {
      const corruptedData = '{invalid json';

      vi.mocked(existsSync).mockReturnValue(true);
      // Note: Implementation calls readFile twice - once in try block (fails parse),
      // then again in the backup logic to read the corrupted file for backup
      vi.mocked(readFile)
        .mockResolvedValueOnce(corruptedData)  // First call in try block
        .mockResolvedValueOnce(corruptedData); // Second call for backup

      vi.mocked(writeFile).mockResolvedValue();

      const state = await loadState();

      expect(state.tours).toEqual([]);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/concerts\.json\.backup-\d+$/),
        corruptedData
      );
    });

    it('handles backup failure gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce('{bad json')
        .mockRejectedValueOnce(new Error('Cannot read file'));

      const state = await loadState();

      expect(state.tours).toEqual([]);
    });

    it('returns empty state when directory creation fails', async () => {
      // Test scenario: data directory doesn't exist and mkdir fails
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

      const state = await loadState();

      // Should catch error and return empty state
      expect(state.tours).toEqual([]);
    });
  });

  describe('saveState', () => {
    it('creates data directory if missing', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue();
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('serializes state correctly', async () => {
      const state = createMockState({
        tours: [
          createMockTour({
            id: 'tour-1',
            continent: Continent.Europe,
            startDate: new Date('2026-03-15T20:00:00Z'),
            endDate: new Date('2026-03-29T22:00:00Z'),
            announcementDate: new Date('2026-03-10T12:00:00Z'),
            concerts: [
              createMockConcert({
                id: '1',
                date: new Date('2026-03-15T20:00:00Z'),
                cancellationDate: new Date('2026-03-14T22:00:00Z')
              })
            ]
          })
        ]
      });

      let savedContent: string = '';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockImplementation((path, data) => {
        savedContent = data as string;
        return Promise.resolve();
      });
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      const parsed = JSON.parse(savedContent);
      expect(parsed.tours).toHaveLength(1);
      expect(parsed.tours[0].id).toBe('tour-1');
      expect(parsed.tours[0].continent).toBe('Europe');
      // Tour dates serialized to ISO strings
      expect(parsed.tours[0].startDate).toBe('2026-03-15T20:00:00.000Z');
      expect(parsed.tours[0].endDate).toBe('2026-03-29T22:00:00.000Z');
      expect(parsed.tours[0].announcementDate).toBe('2026-03-10T12:00:00.000Z');
      // Concert data serialized
      expect(parsed.tours[0].concerts).toHaveLength(1);
      expect(parsed.tours[0].concerts[0].id).toBe('1');
      // Venue object serialized as plain object
      expect(parsed.tours[0].concerts[0].venue).toEqual(state.tours[0].concerts[0].venue);
      expect(typeof parsed.tours[0].concerts[0].venue.name).toBe('string');
      expect(typeof parsed.tours[0].concerts[0].venue.city).toBe('string');
      // Concert dates serialized to ISO strings
      expect(parsed.tours[0].concerts[0].date).toBe('2026-03-15T20:00:00.000Z');
      expect(parsed.tours[0].concerts[0].cancellationDate).toBe('2026-03-14T22:00:00.000Z');
      // Boolean flags preserved
      expect(parsed.tours[0].concerts[0].isCanceled).toBe(false);
    });

    it('uses atomic write pattern', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue();
      vi.mocked(rename).mockResolvedValue();

      await saveState(state);

      // Verify temp file written first
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.any(String),
        'utf-8'
      );

      // Verify rename called
      expect(rename).toHaveBeenCalledWith(
        expect.stringMatching(/\.tmp$/),
        expect.stringContaining('concerts.json')
      );
    });

    it('throws error if write fails', async () => {
      const state = createMockState();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

      await expect(saveState(state)).rejects.toThrow('Write failed');
    });
  });
});
