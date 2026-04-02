import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BlueskyClient } from '../infrastructure/BlueskyClient.js';
import { StateRepository } from '../infrastructure/StateRepository.js';
import { Concert } from '../domain/Concert.js';

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATE_FILE = join(__dirname, '..', '..', 'data', 'concerts.json');

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Force Cancel] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

/**
 * Get the next concert to cancel (earliest cancellation date, not yet canceled)
 */
function getNextConcertToCancel(state: any): Concert | null {
  // Extract all concerts from all tours
  const allConcerts = state.getTours().flatMap((tour: any) => tour.concerts);

  // Filter to uncanceled concerts only
  const uncanceled = allConcerts.filter((concert: Concert) => concert.isActive());

  if (uncanceled.length === 0) {
    return null;
  }

  // Sort by cancellation date (earliest first)
  uncanceled.sort(
    (a: Concert, b: Concert) => a.cancellationDate.getTime() - b.cancellationDate.getTime()
  );

  return uncanceled[0];
}

/**
 * Force cancellation of next concert, bypassing time restrictions
 */
async function cancelNext(): Promise<void> {
  console.log('[Force Cancel] Loading state...');

  // Load current state
  const repository = new StateRepository(STATE_FILE);
  const state = await repository.load();

  const totalConcerts = state.getTours().reduce(
    (sum, tour) => sum + tour.concerts.length,
    0
  );
  console.log(
    `[Force Cancel] Loaded ${state.getTours().length} tours (${totalConcerts} concerts total)`
  );

  // Find next concert to cancel
  console.log('[Force Cancel] Finding next concert to cancel...');
  const concert = getNextConcertToCancel(state);

  if (!concert) {
    if (state.getTours().length === 0) {
      console.log('[Force Cancel] No tours exist yet. Run "npm run force:tour" first.');
    } else {
      console.log('[Force Cancel] All concerts are already canceled.');
    }
    process.exit(0);
  }

  // Display concert details
  console.log(`[Force Cancel] Target: ${concert.venue.name}, ${concert.venue.city}`);
  console.log(`[Force Cancel] Show date: ${concert.date.toISOString()}`);
  console.log(
    `[Force Cancel] Was scheduled to cancel: ${concert.cancellationDate.toISOString()}`
  );

  // Authenticate Bluesky client
  console.log('[Force Cancel] Authenticating with Bluesky...');
  const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

  try {
    await client.authenticate();
  } catch (error) {
    console.error('[Force Cancel] Authentication failed:', error);
    process.exit(1);
  }

  // Cancel concert
  console.log('[Force Cancel] Posting cancellation...');
  try {
    await concert.cancel(client);
    await repository.save(state);

    console.log(`[Force Cancel] Posted cancellation: ${concert.cancelPostId}`);
    console.log('[Force Cancel] ✓ Concert canceled successfully!');
  } catch (error) {
    console.error('[Force Cancel] Failed to cancel concert:', error);
    process.exit(1);
  }
}

// Run script
cancelNext().catch(error => {
  console.error('[Force Cancel] Fatal error:', error);
  process.exit(1);
});
