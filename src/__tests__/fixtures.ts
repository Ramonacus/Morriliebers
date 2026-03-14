import type { Concert, State, Venue } from '../types.js';

/**
 * Mock venues for testing
 */
export const mockVenues = {
  madrid: { name: 'Sala But', city: 'Madrid' },
  barcelona: { name: 'Razzmatazz', city: 'Barcelona' },
  valencia: { name: 'La Rambleta', city: 'Valencia' }
};

/**
 * Create a mock concert with optional overrides
 */
export function createMockConcert(overrides?: Partial<Concert>): Concert {
  return {
    id: 'test-id-123',
    venue: mockVenues.madrid,
    date: new Date('2026-03-15T20:00:00'),
    announcementDate: new Date('2026-03-10T12:00:00'),
    cancellationDate: new Date('2026-03-14T22:00:00'),
    isPinned: false,
    isCanceled: false,
    ...overrides
  };
}

/**
 * Create a mock state with optional overrides
 */
export function createMockState(overrides?: Partial<State>): State {
  return {
    concerts: [],
    ...overrides
  };
}
