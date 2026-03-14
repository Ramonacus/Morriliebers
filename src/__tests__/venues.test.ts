import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRandomVenue, venues } from '../venues.js';

describe('getRandomVenue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a valid venue object', () => {
    const venue = getRandomVenue();

    expect(venue).toHaveProperty('name');
    expect(venue).toHaveProperty('city');
    expect(typeof venue.name).toBe('string');
    expect(typeof venue.city).toBe('string');
  });

  it('returns venue from the loaded venues array', () => {
    const venue = getRandomVenue();

    // Venue should exist in the venues array
    const found = venues.some(v => v.name === venue.name && v.city === venue.city);
    expect(found).toBe(true);
  });

  it('selects specific venue when Math.random is mocked', () => {
    // Mock to select first venue
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const venue = getRandomVenue();

    expect(venue).toEqual(venues[0]);
  });

  it('selects different venue with different random value', () => {
    // Mock to select last venue (random returns value close to 1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const venue = getRandomVenue();

    const expectedIndex = Math.floor(0.99 * venues.length);
    expect(venue).toEqual(venues[expectedIndex]);
  });
});
