import { randomUUID } from 'crypto';
import { Continent, type Concert, type State, type Venue, type Tour } from '../types.js';

/**
 * Mock venues for testing
 */
export const mockVenues = {
  madrid: { name: 'Sala But', city: 'Madrid', continent: Continent.Europe },
  barcelona: { name: 'Razzmatazz', city: 'Barcelona', continent: Continent.Europe },
  valencia: { name: 'La Rambleta', city: 'Valencia', continent: Continent.Europe }
};

/**
 * Create a mock venue with optional overrides
 */
export function createMockVenue(overrides?: Partial<Venue>): Venue {
  return {
    name: 'Test Venue',
    city: 'Test City',
    continent: Continent.Europe,
    ...overrides,
  };
}

/**
 * Create a mock concert with optional overrides
 */
export function createMockConcert(overrides?: Partial<Concert>): Concert {
  const now = Date.now();
  return {
    id: randomUUID(),
    venue: mockVenues.madrid,
    date: new Date(now + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    cancellationDate: new Date(now + 4 * 24 * 60 * 60 * 1000), // 4 days from now (20-24h before)
    weekInTour: 1,
    isCanceled: false,
    ...overrides
  };
}

/**
 * Create a mock tour with optional overrides
 */
export function createMockTour(overrides?: Partial<Tour>): Tour {
  const now = Date.now();
  const startDate = new Date(now + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  const endDate = new Date(now + 21 * 24 * 60 * 60 * 1000); // 3 weeks from now

  return {
    id: randomUUID(),
    continent: Continent.Europe,
    startDate,
    endDate,
    announcementDate: new Date(now),
    weeklyPostIds: [],
    concerts: [createMockConcert()],
    ...overrides
  };
}

/**
 * Create a mock state with optional overrides
 */
export function createMockState(overrides?: Partial<State>): State {
  return {
    tours: [],
    ...overrides
  };
}
