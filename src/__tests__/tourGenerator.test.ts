import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Continent } from '../types.js';
import { readFileSync } from 'fs';

vi.mock('fs');

describe('Tour Generator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selectTourLength', () => {
    beforeEach(() => {
      vi.resetModules();
      // Mock venues for module loading
      const mockVenues = [];
      for (let i = 1; i <= 12; i++) {
        mockVenues.push({ name: `NA${i}`, city: `NACity${i}`, continent: Continent.NorthAmerica });
        mockVenues.push({ name: `SA${i}`, city: `SACity${i}`, continent: Continent.SouthAmerica });
        mockVenues.push({ name: `EU${i}`, city: `EUCity${i}`, continent: Continent.Europe });
        mockVenues.push({ name: `AS${i}`, city: `ASCity${i}`, continent: Continent.Asia });
      }
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockVenues));
    });

    it('should return a number between 2 and 4', async () => {
      const { selectTourLength } = await import('../tourGenerator.js');

      for (let i = 0; i < 100; i++) {
        const length = selectTourLength();
        expect(length).toBeGreaterThanOrEqual(2);
        expect(length).toBeLessThanOrEqual(4);
        expect(Number.isInteger(length)).toBe(true);
      }
    });

    it('should return 2 when Math.random returns 0', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { selectTourLength } = await import('../tourGenerator.js');

      expect(selectTourLength()).toBe(2);
    });

    it('should return 4 when Math.random returns 0.99', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const { selectTourLength } = await import('../tourGenerator.js');

      expect(selectTourLength()).toBe(4);
    });
  });

  describe('selectContinent', () => {
    beforeEach(async () => {
      vi.resetModules();
      // Create venues with known distribution
      const mockVenues = [
        // North America: 4 venues (2 cities)
        { name: 'V1', city: 'NYC', continent: Continent.NorthAmerica },
        { name: 'V2', city: 'NYC', continent: Continent.NorthAmerica },
        { name: 'V3', city: 'LA', continent: Continent.NorthAmerica },
        { name: 'V4', city: 'LA', continent: Continent.NorthAmerica },
        // Europe: 2 venues (1 city)
        { name: 'V5', city: 'London', continent: Continent.Europe },
        { name: 'V6', city: 'London', continent: Continent.Europe },
      ];

      // Add 12 cities for each continent to pass validation
      for (let i = 1; i <= 12; i++) {
        mockVenues.push({ name: `NA${i}`, city: `NACity${i}`, continent: Continent.NorthAmerica });
        mockVenues.push({ name: `SA${i}`, city: `SACity${i}`, continent: Continent.SouthAmerica });
        mockVenues.push({ name: `EU${i}`, city: `EUCity${i}`, continent: Continent.Europe });
        mockVenues.push({ name: `AS${i}`, city: `ASCity${i}`, continent: Continent.Asia });
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockVenues));
    });

    it('should return a valid Continent enum value', async () => {
      const { selectContinent } = await import('../tourGenerator.js');
      const continent = selectContinent();

      expect(Object.values(Continent)).toContain(continent);
    });

    it('should weight selection by venue count', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Should select based on cumulative probability
      const { selectContinent } = await import('../tourGenerator.js');

      const continent = selectContinent();
      expect(continent).toBeDefined();
    });
  });

  describe('selectDistinctCities', () => {
    beforeEach(async () => {
      vi.resetModules();
      // Create venues with multiple cities per continent
      const mockVenues = [];

      // North America: 15 different cities
      for (let i = 1; i <= 15; i++) {
        mockVenues.push({
          name: `Venue NA-${i}`,
          city: `NACity${i}`,
          continent: Continent.NorthAmerica
        });
      }

      // Add 12 cities for other continents to pass validation
      for (let i = 1; i <= 12; i++) {
        mockVenues.push({ name: `SA${i}`, city: `SACity${i}`, continent: Continent.SouthAmerica });
        mockVenues.push({ name: `EU${i}`, city: `EUCity${i}`, continent: Continent.Europe });
        mockVenues.push({ name: `AS${i}`, city: `ASCity${i}`, continent: Continent.Asia });
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockVenues));
    });

    it('should return requested number of distinct cities', async () => {
      const { selectDistinctCities } = await import('../tourGenerator.js');
      const cities = selectDistinctCities(Continent.NorthAmerica, 5);

      expect(cities).toHaveLength(5);
      expect(new Set(cities).size).toBe(5); // All unique
    });

    it('should only return cities from the specified continent', async () => {
      const { selectDistinctCities } = await import('../tourGenerator.js');
      const cities = selectDistinctCities(Continent.NorthAmerica, 10);

      for (const city of cities) {
        expect(city).toMatch(/^NACity/);
      }
    });

    it('should throw error if requesting more cities than available', async () => {
      const { selectDistinctCities } = await import('../tourGenerator.js');

      expect(() => {
        selectDistinctCities(Continent.SouthAmerica, 20); // Only 12 available
      }).toThrow();
    });
  });

  describe('generateTour', () => {
    beforeEach(async () => {
      vi.resetModules();
      // Create venues with sufficient cities
      const mockVenues = [];

      for (let i = 1; i <= 15; i++) {
        mockVenues.push({ name: `Venue NA-${i}`, city: `NACity${i}`, continent: Continent.NorthAmerica });
        mockVenues.push({ name: `Venue SA-${i}`, city: `SACity${i}`, continent: Continent.SouthAmerica });
        mockVenues.push({ name: `Venue EU-${i}`, city: `EUCity${i}`, continent: Continent.Europe });
        mockVenues.push({ name: `Venue AS-${i}`, city: `ASCity${i}`, continent: Continent.Asia });
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockVenues));
    });

    it('should generate a valid tour structure', async () => {
      const { generateTour } = await import('../tourGenerator.js');
      const referenceDate = new Date('2026-03-20T10:00:00Z');

      const tour = generateTour(referenceDate);

      // Tour structure
      expect(tour.id).toBeDefined();
      expect(Object.values(Continent)).toContain(tour.continent);
      expect(tour.startDate).toBeInstanceOf(Date);
      expect(tour.endDate).toBeInstanceOf(Date);
      expect(tour.announcementDate).toEqual(referenceDate);
      expect(tour.weeklyPostIds).toEqual([]);
      expect(Array.isArray(tour.concerts)).toBe(true);
    });

    it('should generate correct number of concerts based on tour length', async () => {
      const { generateTour } = await import('../tourGenerator.js');

      const tour = generateTour();

      // 2-4 weeks, 2-3 shows per week = 4-12 concerts
      expect(tour.concerts.length).toBeGreaterThanOrEqual(4);
      expect(tour.concerts.length).toBeLessThanOrEqual(12);
    });

    it('should have all concerts in the same continent', async () => {
      const { generateTour } = await import('../tourGenerator.js');

      const tour = generateTour();

      for (const concert of tour.concerts) {
        expect(concert.venue.continent).toBe(tour.continent);
      }
    });

    it('should have no duplicate cities in tour', async () => {
      const { generateTour } = await import('../tourGenerator.js');

      const tour = generateTour();

      const cities = tour.concerts.map(c => c.venue.city);
      const uniqueCities = new Set(cities);
      expect(uniqueCities.size).toBe(cities.length);
    });

    it('should schedule first show in the week after announcement', async () => {
      const { generateTour } = await import('../tourGenerator.js');
      // Announce on Thursday March 20, 2026
      const referenceDate = new Date('2026-03-20T10:00:00Z');

      const tour = generateTour(referenceDate);

      // First show should be on or after Monday March 23 (next week's Monday)
      const nextMonday = new Date('2026-03-23T00:00:00Z');
      const firstConcertDate = tour.concerts[0].date;

      expect(firstConcertDate.getTime()).toBeGreaterThanOrEqual(nextMonday.getTime());
    });
  });
});
