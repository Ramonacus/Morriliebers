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
  const venuesPath = join(__dirname, '..', 'config', 'venues.json');
  const data = readFileSync(venuesPath, 'utf-8');
  return JSON.parse(data) as Venue[];
}

/**
 * All available venues for concerts
 */
export const venues: Venue[] = loadVenues();

/**
 * Select a random venue from the list
 */
export function getRandomVenue(): Venue {
  const randomIndex = Math.floor(Math.random() * venues.length);
  return venues[randomIndex];
}
