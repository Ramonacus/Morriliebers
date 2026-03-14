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

  it('schedules concerts only on Wed-Sun', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.5, 0.3,  // Concert 1
      0.25, 0.5, 0.4, // Concert 2
      0.5, 0.5, 0.5,  // Concert 3
      0.75, 0.5, 0.6  // Extras
    ]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      const day = concert.date.getDay();
      // 0 = Sunday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      expect([0, 3, 4, 5, 6]).toContain(day);
    });
  });

  it('schedules concerts between 17:00 and 23:30', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.0, 0.1,  // Concert 1: early time
      0.25, 0.9, 0.2, // Concert 2: late time
      0.5, 0.5, 0.3,  // Concert 3: mid time
      0.1, 0.2, 0.4
    ]);

    const concerts = generateWeeklyConcerts();

    concerts.forEach(concert => {
      const hours = concert.date.getHours();
      const minutes = concert.date.getMinutes();

      expect(hours).toBeGreaterThanOrEqual(17);
      expect(hours).toBeLessThanOrEqual(23);

      // Minutes should be 0 or 30
      expect([0, 30]).toContain(minutes);

      // If hour is 23, ensure it's not past 23:30
      if (hours === 23) {
        expect(minutes).toBeLessThanOrEqual(30);
      }
    });
  });

  it('does not schedule duplicate days in same week', () => {
    setMockTime(new Date('2026-03-10T12:00:00'));

    mockRandomSequence([
      0.9,  // 3 concerts
      0.0, 0.5, 0.3,  // Concert 1: day index 0 (Wed)
      0.4, 0.6, 0.4,  // Concert 2: day index 2 (Fri) - different day
      0.8, 0.7, 0.5,  // Concert 3: day index 4 (Sun) - different day
      0.1, 0.2, 0.3
    ]);

    const concerts = generateWeeklyConcerts();

    const days = concerts.map(c => c.date.getDay());
    const uniqueDays = new Set(days);

    expect(uniqueDays.size).toBe(days.length); // No duplicates
  });
});
