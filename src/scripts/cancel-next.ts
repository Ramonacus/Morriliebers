import 'dotenv/config';
import { BlueskyClient } from '../blueskyClient.js';
import { loadState } from '../storage.js';
import { getNextConcertToCancel } from '../scheduler.js';
import { cancelConcert } from '../actions.js';

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Force Cancel] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

/**
 * Force cancellation of next concert, bypassing time restrictions
 */
async function cancelNext(): Promise<void> {
  console.log('[Force Cancel] Loading state...');

  // Load current state
  const state = await loadState();
  const totalConcerts = state.tours.reduce((sum, tour) => sum + tour.concerts.length, 0);
  console.log(`[Force Cancel] Loaded ${state.tours.length} tours (${totalConcerts} concerts total)`);

  // Find next concert to cancel
  console.log('[Force Cancel] Finding next concert to cancel...');
  const concert = getNextConcertToCancel(state.tours);

  if (!concert) {
    if (state.tours.length === 0) {
      console.log('[Force Cancel] No tours exist yet. Run "npm run force:tour" first.');
    } else {
      console.log('[Force Cancel] All concerts are already canceled.');
    }
    process.exit(0);
  }

  // Display concert details
  console.log(`[Force Cancel] Target: ${concert.venue.name}, ${concert.venue.city}`);
  console.log(`[Force Cancel] Show date: ${concert.date.toISOString()}`);
  console.log(`[Force Cancel] Was scheduled to cancel: ${concert.cancellationDate.toISOString()}`);

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
    await cancelConcert(client, state, concert);
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
