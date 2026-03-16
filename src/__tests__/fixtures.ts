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
  const now = Date.now();
  return {
    id: 'test-id-123',
    venue: mockVenues.madrid,
    date: new Date(now + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    announcementDate: new Date(now - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    cancellationDate: new Date(now + 4 * 24 * 60 * 60 * 1000), // 4 days from now
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
