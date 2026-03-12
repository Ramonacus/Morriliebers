import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Venue } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load venues from config file
 */
function loadVenues(): Venue[] {
  try {
    const venuesPath = join(__dirname, '..', 'config', 'venues.json');
    const data = readFileSync(venuesPath, 'utf-8');
    const parsed = JSON.parse(data);

    // Validate it's a non-empty array
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('venues.json must contain a non-empty array');
    }

    // Validate each venue has required properties
    for (let i = 0; i < parsed.length; i++) {
      const venue = parsed[i];
      if (!venue.name || typeof venue.name !== 'string') {
        throw new Error(`Venue at index ${i} missing or invalid 'name' property`);
      }
      if (!venue.city || typeof venue.city !== 'string') {
        throw new Error(`Venue at index ${i} missing or invalid 'city' property`);
      }
    }

    return parsed as Venue[];
  } catch (error) {
    throw new Error(
      `Failed to load venues from config/venues.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * All available venues for concerts
 */
export const venues: Venue[] = loadVenues();

/**
 * Select a random venue from the list
 */
export function getRandomVenue(): Venue {
  if (venues.length === 0) {
    throw new Error('No venues available');
  }
  const randomIndex = Math.floor(Math.random() * venues.length);
  return venues[randomIndex];
}
