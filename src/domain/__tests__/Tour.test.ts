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
});
