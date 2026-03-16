import 'dotenv/config';
import { initializeClient, loadAndValidateState, saveAndExit } from './utils.js';
import { hasRemainingConcertsInWeek } from '../scheduler.js';
import type { Concert } from '../types.js';

/**
 * Find the next chronologically upcoming concert that hasn't been canceled
 */
function findNextConcert(concerts: Concert[]): Concert | undefined {
  const now = new Date();

  return concerts
    .filter(concert => !concert.isCanceled && concert.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

/**
 * Main function to cancel the next upcoming concert
 */
export async function runCancelNext(): Promise<void> {
  try {
    console.log('[CancelNext] Starting manual cancellation...');

    // Initialize
    const client = await initializeClient();
    const state = await loadAndValidateState();

    // Find next concert
    const nextConcert = findNextConcert(state.concerts);

    if (!nextConcert) {
      console.log('[CancelNext] No upcoming concerts to cancel');
      return await saveAndExit(state, 0);
    }

    console.log(`[CancelNext] Canceling concert at ${nextConcert.venue.name}, ${nextConcert.venue.city}`);

    // Post cancellation
    const cancelPostUri = await client.postCancellation(nextConcert);

    // Update concert state
    nextConcert.isCanceled = true;
    nextConcert.cancelPostId = cancelPostUri;

    // Check if we should unpin the weekly announcement
    if (!hasRemainingConcertsInWeek(nextConcert, state.concerts)) {
      console.log('[CancelNext] No remaining concerts this week, unpinning announcement');
      await client.unpinPost();
      nextConcert.isPinned = false;
    }

    console.log('[CancelNext] Canceled concert successfully');

    // Save and exit
    await saveAndExit(state, 0);
  } catch (error) {
    console.error('[CancelNext] Failed to cancel concert');
    await saveAndExit({ concerts: [] }, 1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCancelNext();
}
