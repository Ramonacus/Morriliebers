import 'dotenv/config';
import { BlueskyClient } from '../blueskyClient.js';
import { loadState, saveState } from '../storage.js';
import { getNextConcertToCancel } from '../scheduler.js';

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

  // Post cancellation
  console.log('[Force Cancel] Posting cancellation...');
  let cancelPostId: string;

  try {
    cancelPostId = await client.postCancellation(concert);
    console.log(`[Force Cancel] Posted cancellation: ${cancelPostId}`);
  } catch (error) {
    console.error('[Force Cancel] Failed to post cancellation:', error);
    process.exit(1);
  }

  // Update state
  concert.isCanceled = true;
  concert.cancelPostId = cancelPostId;

  try {
    await saveState(state);
    console.log('[Force Cancel] State saved successfully');
  } catch (error) {
    console.error('[Force Cancel] ⚠️  Failed to save state (post already live - state inconsistent):', error);
  }

  console.log('[Force Cancel] ✓ Concert canceled successfully!');
}

// Run script
cancelNext().catch(error => {
  console.error('[Force Cancel] Fatal error:', error);
  process.exit(1);
});
