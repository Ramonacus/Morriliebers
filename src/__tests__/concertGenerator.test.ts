import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateWeeklyConcerts } from '../concertGenerator.js';
import { mockRandomSequence, setMockTime, resetMockTime } from './helpers.js';
import * as venuesModule from '../venues.js';

describe('generateWeeklyConcerts', () => {
  beforeEach(() => {
    // Mock getRandomVenue to return predictable venues
    vi.spyOn(venuesModule, 'getRandomVenue').mockReturnValue({
      name: 'Test Venue',
      city: 'Test City'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockTime();
  });

  it('generates 1-3 concerts', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    // Mock Math.random to generate 2 concerts
    mockRandomSequence([
      0.5,  // Concert count: floor(0.5 * 3) + 1 = 2
      0.2,  // Day selection
      0.3,  // Time slot
      0.4,  // Random for cancellation
      0.6,  // Day selection
      0.7,  // Time slot
      0.5   // Random for cancellation
    ]);

    const concerts = generateWeeklyConcerts();

    // With mocked random value 0.5, should generate exactly 2 concerts
    expect(concerts).toHaveLength(2);
  });
});
