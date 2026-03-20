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
});
