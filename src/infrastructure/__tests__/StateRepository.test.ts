import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateRepository } from '../StateRepository.js';
import { BotState } from '../../domain/BotState.js';
import { Tour } from '../../domain/Tour.js';
import { Concert } from '../../domain/Concert.js';
import { Continent } from '../../types.js';
import type { Venue } from '../../types.js';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
  };
});
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

describe('StateRepository', () => {
  const mockVenue: Venue = {
    name: 'Test Venue',
    city: 'Test City',
    continent: Continent.NorthAmerica,
    capacity: '1000'
  };

  const testFilePath = '/test/data/state.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should load and deserialize state from file', async () => {
      const mockData = {
        tours: [{
          id: 'tour-1',
          continent: Continent.NorthAmerica,
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: '2026-04-14T00:00:00.000Z',
          announcementDate: '2026-03-27T10:00:00.000Z',
          overviewPostId: undefined,
          weeklyPostIds: [],
          concerts: [{
            id: 'concert-1',
            venue: mockVenue,
            date: '2026-04-01T20:00:00.000Z',
            cancellationDate: '2026-03-31T20:00:00.000Z',
            weekInTour: 1,
            isCanceled: false,
            cancelPostId: undefined
          }]
        }],
        lastTourGenerationDate: '2026-03-27T10:00:00.000Z'
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockData));

      const repository = new StateRepository(testFilePath);
      const state = await repository.load();

      expect(state.getTours()).toHaveLength(1);
      expect(state.getTours()[0].id).toBe('tour-1');
      expect(state.lastTourGenerationDate).toEqual(new Date('2026-03-27T10:00:00Z'));
    });

    it('should return empty state when file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined as any);

      const repository = new StateRepository(testFilePath);
      const state = await repository.load();

      expect(state.getTours()).toEqual([]);
      expect(state.lastTourGenerationDate).toBeUndefined();
    });

    it('should create directory if it does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined as any);

      const repository = new StateRepository(testFilePath);
      await repository.load();

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('test/data'), { recursive: true });
    });

    it('should handle corrupt JSON and return empty state', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue('{ invalid json }');
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const repository = new StateRepository(testFilePath);
      const state = await repository.load();

      expect(state.getTours()).toEqual([]);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.backup-'),
        '{ invalid json }'
      );
    });

    it('should handle missing required fields and return empty state', async () => {
      const invalidData = { tours: 'not-an-array' };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidData));
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const repository = new StateRepository(testFilePath);
      const state = await repository.load();

      expect(state.getTours()).toEqual([]);
    });
  });

  describe('save', () => {
    it('should serialize and save state to file atomically', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [concert]
      });

      const state = new BotState({
        tours: [tour],
        lastTourGenerationDate: new Date('2026-03-27T10:00:00Z')
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(rename).mockResolvedValue(undefined);

      const repository = new StateRepository(testFilePath);
      await repository.save(state);

      expect(writeFile).toHaveBeenCalledWith(
        testFilePath + '.tmp',
        expect.stringContaining('"id": "tour-1"'),
        'utf-8'
      );
      expect(rename).toHaveBeenCalledWith(testFilePath + '.tmp', testFilePath);
    });

    it('should create directory if it does not exist before saving', async () => {
      const state = new BotState();

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined as any);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(rename).mockResolvedValue(undefined);

      const repository = new StateRepository(testFilePath);
      await repository.save(state);

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('test/data'), { recursive: true });
    });

    it('should handle save errors gracefully', async () => {
      const state = new BotState();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

      const repository = new StateRepository(testFilePath);

      await expect(repository.save(state)).rejects.toThrow('Write failed');
    });
  });

  describe('round-trip', () => {
    it('should preserve state through save and load', async () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [concert]
      });

      const originalState = new BotState({
        tours: [tour],
        lastTourGenerationDate: new Date('2026-03-27T10:00:00Z')
      });

      let savedJson: string = '';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockImplementation(async (path, data) => {
        if (path === testFilePath + '.tmp') {
          savedJson = data as string;
        }
      });
      vi.mocked(rename).mockResolvedValue(undefined);
      vi.mocked(readFile).mockImplementation(async () => savedJson);

      const repository = new StateRepository(testFilePath);
      await repository.save(originalState);
      const loadedState = await repository.load();

      expect(loadedState.getTours()).toHaveLength(1);
      expect(loadedState.getTours()[0].id).toBe('tour-1');
      expect(loadedState.lastTourGenerationDate).toEqual(originalState.lastTourGenerationDate);
    });
  });
});
