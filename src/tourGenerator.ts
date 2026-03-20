import { Continent } from './types.js';
import { venues } from './venues.js';

/**
 * Select a random tour length between 2-4 weeks
 */
export function selectTourLength(): number {
  return 2 + Math.floor(Math.random() * 3); // Returns 2, 3, or 4
}

/**
 * Select continent with weighted probability based on venue counts
 */
export function selectContinent(): Continent {
  // Count venues per continent
  const counts = new Map<Continent, number>();
  for (const continent of Object.values(Continent)) {
    counts.set(continent, 0);
  }

  for (const venue of venues) {
    const current = counts.get(venue.continent) || 0;
    counts.set(venue.continent, current + 1);
  }

  // Calculate total
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

  // Select with weighted probability
  const random = Math.random();
  let cumulative = 0;

  for (const [continent, count] of counts.entries()) {
    cumulative += count / total;
    if (random < cumulative) {
      return continent;
    }
  }

  // Fallback (should never reach here)
  return Continent.NorthAmerica;
}
