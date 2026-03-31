import { describe, it, expect } from 'vitest';
import { BotState } from '../BotState.js';
import { Tour } from '../Tour.js';
import { Concert } from '../Concert.js';
import { Continent } from '../../types.js';
import type { Venue } from '../../types.js';

describe('BotState', () => {
  const mockVenue: Venue = {
    name: 'Test Venue',
    city: 'Test City',
    continent: Continent.NorthAmerica,
    capacity: '1000'
  };

  const mockConcert = new Concert({
    id: 'concert-1',
    venue: mockVenue,
    date: new Date('2026-04-01T20:00:00Z'),
    cancellationDate: new Date('2026-03-31T20:00:00Z'),
    weekInTour: 1
  });

  const mockTour = new Tour({
    id: 'tour-1',
    continent: Continent.NorthAmerica,
    startDate: new Date('2026-04-01T00:00:00Z'),
    endDate: new Date('2026-04-14T00:00:00Z'),
    announcementDate: new Date('2026-03-27T10:00:00Z'),
    concerts: [mockConcert]
  });

  describe('construction', () => {
    it('should create state with empty tours', () => {
      const state = new BotState();

      expect(state.getTours()).toEqual([]);
      expect(state.lastTourGenerationDate).toBeUndefined();
    });

    it('should create state with initial tours', () => {
      const state = new BotState({
        tours: [mockTour]
      });

      expect(state.getTours()).toHaveLength(1);
      expect(state.getTours()[0]).toBe(mockTour);
    });

    it('should create state with lastTourGenerationDate', () => {
      const date = new Date('2026-03-27T10:00:00Z');
      const state = new BotState({
        lastTourGenerationDate: date
      });

      expect(state.lastTourGenerationDate).toEqual(date);
    });
  });

  describe('addTour', () => {
    it('should add tour to state', () => {
      const state = new BotState();
      const now = new Date('2026-03-27T10:00:00Z');

      state.addTour(mockTour, now);

      expect(state.getTours()).toHaveLength(1);
      expect(state.getTours()[0]).toBe(mockTour);
      expect(state.lastTourGenerationDate).toEqual(now);
    });

    it('should append multiple tours', () => {
      const state = new BotState({
        tours: [mockTour]
      });

      const tour2 = new Tour({
        id: 'tour-2',
        continent: Continent.Europe,
        startDate: new Date('2026-05-01T00:00:00Z'),
        endDate: new Date('2026-05-14T00:00:00Z'),
        announcementDate: new Date('2026-04-27T10:00:00Z'),
        concerts: []
      });

      state.addTour(tour2, new Date());

      expect(state.getTours()).toHaveLength(2);
    });
  });

  describe('getAllConcertsToCancel', () => {
    it('should return concerts due for cancellation', () => {
      const concert1 = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const concert2 = new Concert({
        id: 'concert-2',
        venue: mockVenue,
        date: new Date('2026-04-03T20:00:00Z'),
        cancellationDate: new Date('2026-04-02T20:00:00Z'),
        weekInTour: 1
      });

      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [concert1, concert2]
      });

      const state = new BotState({ tours: [tour] });
      const now = new Date('2026-03-31T21:00:00Z');

      const toCancel = state.getAllConcertsToCancel(now);

      expect(toCancel).toHaveLength(1);
      expect(toCancel[0].id).toBe('concert-1');
    });

    it('should aggregate concerts from multiple tours', () => {
      const concert1 = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const concert2 = new Concert({
        id: 'concert-2',
        venue: mockVenue,
        date: new Date('2026-05-01T20:00:00Z'),
        cancellationDate: new Date('2026-04-30T20:00:00Z'),
        weekInTour: 1
      });

      const tour1 = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [concert1]
      });

      const tour2 = new Tour({
        id: 'tour-2',
        continent: Continent.Europe,
        startDate: new Date('2026-05-01T00:00:00Z'),
        endDate: new Date('2026-05-14T00:00:00Z'),
        announcementDate: new Date('2026-04-27T10:00:00Z'),
        concerts: [concert2]
      });

      const state = new BotState({ tours: [tour1, tour2] });
      const now = new Date('2026-05-01T00:00:00Z');

      const toCancel = state.getAllConcertsToCancel(now);

      expect(toCancel).toHaveLength(2);
    });
  });

  describe('shouldGenerateTour', () => {
    it('should return true during 8-14h window with no active concerts', () => {
      const canceledConcert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1,
        isCanceled: true
      });

      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [canceledConcert]
      });

      const state = new BotState({ tours: [tour] });
      const now = new Date('2026-04-02T10:00:00Z'); // 10:00

      expect(state.shouldGenerateTour(now)).toBe(true);
    });

    it('should return false before 8:00', () => {
      const state = new BotState();
      const now = new Date('2026-03-27T07:59:00Z');

      expect(state.shouldGenerateTour(now)).toBe(false);
    });

    it('should return false at 14:00 or after', () => {
      const state = new BotState();
      const now = new Date('2026-03-27T14:00:00Z');

      expect(state.shouldGenerateTour(now)).toBe(false);
    });

    it('should return false when active concerts exist', () => {
      const state = new BotState({ tours: [mockTour] });
      const now = new Date('2026-03-27T10:00:00Z');

      expect(state.shouldGenerateTour(now)).toBe(false);
    });

    it('should return false if tour already generated today', () => {
      const today = new Date('2026-03-27T10:00:00Z');
      const state = new BotState({
        lastTourGenerationDate: today
      });

      expect(state.shouldGenerateTour(today)).toBe(false);
    });

    it('should return true if tour generated yesterday', () => {
      const yesterday = new Date('2026-03-26T10:00:00Z');
      const state = new BotState({
        lastTourGenerationDate: yesterday
      });

      const today = new Date('2026-03-27T10:00:00Z');
      expect(state.shouldGenerateTour(today)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
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

      const json = state.toJSON();

      expect(json.tours).toHaveLength(1);
      expect(json.tours[0]).toEqual(tour.toJSON());
      expect(json.lastTourGenerationDate).toBe('2026-03-27T10:00:00.000Z');
    });

    it('should deserialize from JSON', () => {
      const json = {
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

      const state = BotState.fromJSON(json);

      expect(state.getTours()).toHaveLength(1);
      expect(state.getTours()[0].id).toBe('tour-1');
      expect(state.lastTourGenerationDate).toEqual(new Date('2026-03-27T10:00:00Z'));
    });

    it('should round-trip through serialization', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: []
      });

      const original = new BotState({
        tours: [tour],
        lastTourGenerationDate: new Date('2026-03-27T10:00:00Z')
      });

      const json = original.toJSON();
      const deserialized = BotState.fromJSON(json);

      expect(deserialized.getTours()).toHaveLength(1);
      expect(deserialized.lastTourGenerationDate).toEqual(original.lastTourGenerationDate);
    });
  });
});
