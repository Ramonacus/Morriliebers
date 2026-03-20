import 'dotenv/config';
import { initializeClient, loadAndValidateState, saveAndExit } from './utils.js';
import type { State, Concert } from '../types.js';

/**
 * Find the next uncanceled concert (earliest by concert date)
 */
function findNextConcert(state: State): Concert | null {
  const allConcerts = state.tours.flatMap(tour => tour.concerts);
  const uncanceled = allConcerts.filter(c => !c.isCanceled);

  if (uncanceled.length === 0) {
    return null;
  }

  uncanceled.sort((a, b) => a.date.getTime() - b.date.getTime());
  return uncanceled[0];
}

export async function cancelNextScript() {
  const client = await initializeClient();
  const state = await loadAndValidateState();

  const nextConcert = findNextConcert(state);

  if (!nextConcert) {
    console.error('[Scripts] Error: No uncanceled concerts found');
    await saveAndExit(state, 1);
    return; // Prevent further execution in tests where exit is mocked
  }

  const dateStr = nextConcert.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  console.log(`[Scripts] Found next concert: ${nextConcert.venue.name}, ${nextConcert.venue.city} on ${dateStr}`);

  console.log('[Scripts] Posting cancellation...');
  const postId = await client.postCancellation(nextConcert);

  nextConcert.isCanceled = true;
  nextConcert.cancelPostId = postId;

  console.log('[Scripts] Cancellation posted successfully');

  await saveAndExit(state, 0);
}

// Only run if executed directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  cancelNextScript();
}
