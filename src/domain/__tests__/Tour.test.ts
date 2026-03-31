import { describe, it, expect } from 'vitest';
import { Tour } from '../Tour.js';
import { Concert } from '../Concert.js';
import { Continent } from '../../types.js';
import type { Venue } from '../../types.js';

describe('Tour', () => {
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

  describe('construction', () => {
    it('should create a tour with all required properties', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [mockConcert]
      });

      expect(tour.id).toBe('tour-1');
      expect(tour.continent).toBe(Continent.NorthAmerica);
      expect(tour.startDate).toEqual(new Date('2026-04-01T00:00:00Z'));
      expect(tour.endDate).toEqual(new Date('2026-04-14T00:00:00Z'));
      expect(tour.announcementDate).toEqual(new Date('2026-03-27T10:00:00Z'));
      expect(tour.overviewPostId).toBeUndefined();
      expect(tour.weeklyPostIds).toEqual([]);
      expect(tour.concerts).toHaveLength(1);
    });

    it('should create a tour with post IDs', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        overviewPostId: 'overview-123',
        weeklyPostIds: ['week1-123', 'week2-123'],
        concerts: []
      });

      expect(tour.overviewPostId).toBe('overview-123');
      expect(tour.weeklyPostIds).toEqual(['week1-123', 'week2-123']);
    });
  });

  describe('getConcertsToCancel', () => {
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

      const now = new Date('2026-03-31T21:00:00Z');
      const toCancel = tour.getConcertsToCancel(now);

      expect(toCancel).toHaveLength(1);
      expect(toCancel[0].id).toBe('concert-1');
    });

    it('should return empty array when no concerts due', () => {
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

      const now = new Date('2026-03-31T19:00:00Z');
      const toCancel = tour.getConcertsToCancel(now);

      expect(toCancel).toHaveLength(0);
    });
  });

  describe('hasActiveConcerts', () => {
    it('should return true when tour has active concerts', () => {
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

      expect(tour.hasActiveConcerts()).toBe(true);
    });

    it('should return false when all concerts canceled', () => {
      const concert = new Concert({
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
        concerts: [concert]
      });

      expect(tour.hasActiveConcerts()).toBe(false);
    });
  });

  describe('getWeekCount', () => {
    it('should return maximum week number from concerts', () => {
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
        date: new Date('2026-04-08T20:00:00Z'),
        cancellationDate: new Date('2026-04-07T20:00:00Z'),
        weekInTour: 2
      });

      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: [concert1, concert2]
      });

      expect(tour.getWeekCount()).toBe(2);
    });

    it('should return 0 for tour with no concerts', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: []
      });

      expect(tour.getWeekCount()).toBe(0);
    });
  });

  describe('addConcert', () => {
    it('should add concert to tour', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: []
      });

      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      tour.addConcert(concert);

      expect(tour.concerts).toHaveLength(1);
      expect(tour.concerts[0]).toBe(concert);
    });
  });

  describe('setAnnouncementPosts', () => {
    it('should set post IDs', () => {
      const tour = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        concerts: []
      });

      tour.setAnnouncementPosts('overview-123', ['week1-123', 'week2-123']);

      expect(tour.overviewPostId).toBe('overview-123');
      expect(tour.weeklyPostIds).toEqual(['week1-123', 'week2-123']);
    });
  });

  describe('Tour.generate', () => {
    it('should generate a tour with concerts', () => {
      const referenceDate = new Date('2026-03-27T10:00:00Z');
      const tour = Tour.generate(referenceDate);

      expect(tour.id).toBeDefined();
      expect(tour.continent).toBeDefined();
      expect(tour.startDate).toBeInstanceOf(Date);
      expect(tour.endDate).toBeInstanceOf(Date);
      expect(tour.announcementDate).toEqual(referenceDate);
      expect(tour.concerts.length).toBeGreaterThan(0);
      expect(tour.startDate.getTime()).toBeGreaterThan(referenceDate.getTime());
    });

    it('should generate concerts with proper structure', () => {
      const tour = Tour.generate(new Date('2026-03-27T10:00:00Z'));

      for (const concert of tour.concerts) {
        expect(concert.id).toBeDefined();
        expect(concert.venue).toBeDefined();
        expect(concert.date).toBeInstanceOf(Date);
        expect(concert.cancellationDate).toBeInstanceOf(Date);
        expect(concert.weekInTour).toBeGreaterThanOrEqual(1);
        expect(concert.isCanceled).toBe(false);
        expect(concert.cancelPostId).toBeUndefined();
      }
    });

    it('should generate concerts sorted by date', () => {
      const tour = Tour.generate(new Date('2026-03-27T10:00:00Z'));

      for (let i = 1; i < tour.concerts.length; i++) {
        expect(tour.concerts[i].date.getTime()).toBeGreaterThanOrEqual(
          tour.concerts[i - 1].date.getTime()
        );
      }
    });

    it('should generate cancellation dates 20-24h before shows', () => {
      const tour = Tour.generate(new Date('2026-03-27T10:00:00Z'));

      for (const concert of tour.concerts) {
        const hoursBefore = (concert.date.getTime() - concert.cancellationDate.getTime()) / (1000 * 60 * 60);
        expect(hoursBefore).toBeGreaterThanOrEqual(20);
        expect(hoursBefore).toBeLessThan(25);
      }
    });

    it('should use distinct cities for all concerts', () => {
      const tour = Tour.generate(new Date('2026-03-27T10:00:00Z'));
      const cities = new Set(tour.concerts.map(c => c.venue.city));
      expect(cities.size).toBe(tour.concerts.length);
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
        overviewPostId: 'overview-123',
        weeklyPostIds: ['week1-123'],
        concerts: [concert]
      });

      const json = tour.toJSON();

      expect(json).toEqual({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2026-04-14T00:00:00.000Z',
        announcementDate: '2026-03-27T10:00:00.000Z',
        overviewPostId: 'overview-123',
        weeklyPostIds: ['week1-123'],
        concerts: [concert.toJSON()]
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2026-04-14T00:00:00.000Z',
        announcementDate: '2026-03-27T10:00:00.000Z',
        overviewPostId: 'overview-123',
        weeklyPostIds: ['week1-123'],
        concerts: [{
          id: 'concert-1',
          venue: mockVenue,
          date: '2026-04-01T20:00:00.000Z',
          cancellationDate: '2026-03-31T20:00:00.000Z',
          weekInTour: 1,
          isCanceled: false,
          cancelPostId: undefined
        }]
      };

      const tour = Tour.fromJSON(json);

      expect(tour.id).toBe('tour-1');
      expect(tour.continent).toBe(Continent.NorthAmerica);
      expect(tour.startDate).toEqual(new Date('2026-04-01T00:00:00Z'));
      expect(tour.concerts).toHaveLength(1);
    });

    it('should round-trip through serialization', () => {
      const concert = new Concert({
        id: 'concert-1',
        venue: mockVenue,
        date: new Date('2026-04-01T20:00:00Z'),
        cancellationDate: new Date('2026-03-31T20:00:00Z'),
        weekInTour: 1
      });

      const original = new Tour({
        id: 'tour-1',
        continent: Continent.NorthAmerica,
        startDate: new Date('2026-04-01T00:00:00Z'),
        endDate: new Date('2026-04-14T00:00:00Z'),
        announcementDate: new Date('2026-03-27T10:00:00Z'),
        overviewPostId: 'overview-123',
        weeklyPostIds: ['week1-123'],
        concerts: [concert]
      });

      const json = original.toJSON();
      const deserialized = Tour.fromJSON(json);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.startDate).toEqual(original.startDate);
      expect(deserialized.concerts).toHaveLength(1);
    });
  });
});
