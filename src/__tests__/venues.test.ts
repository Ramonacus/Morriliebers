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

describe('venues data validation', () => {
  it('venues array is non-empty', () => {
    expect(venues.length).toBeGreaterThan(0);
  });

  it('all venues have required name property', () => {
    venues.forEach((venue, index) => {
      expect(venue.name, `Venue at index ${index} missing name`).toBeTruthy();
      expect(typeof venue.name, `Venue at index ${index} name not string`).toBe('string');
    });
  });

  it('all venues have required city property', () => {
    venues.forEach((venue, index) => {
      expect(venue.city, `Venue at index ${index} missing city`).toBeTruthy();
      expect(typeof venue.city, `Venue at index ${index} city not string`).toBe('string');
    });
  });

  it('optional capacity field is string if present', () => {
    venues.forEach((venue, index) => {
      if ('capacity' in venue && venue.capacity !== undefined) {
        expect(typeof venue.capacity, `Venue at index ${index} capacity not string`).toBe('string');
      }
    });
  });
});
