import 'dotenv/config';
import { BlueskyClient } from '../blueskyClient.js';
import { loadState } from '../storage.js';
import { canGenerateTour, hasActiveConcerts } from '../scheduler.js';
import { generateAndAnnounceTour } from '../actions.js';

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Force Tour] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

/**
 * Force tour generation and announcement, bypassing time restrictions
 */
async function forceTour(): Promise<void> {
  console.log('[Force Tour] Loading state...');

  // Load current state
  const state = await loadState();
  const totalConcerts = state.tours.reduce((sum, tour) => sum + tour.concerts.length, 0);
  console.log(`[Force Tour] Loaded ${state.tours.length} tours (${totalConcerts} concerts total)`);

  // Check business rules (advisory only)
  if (!canGenerateTour(state)) {
    if (hasActiveConcerts(state.tours)) {
      const activeConcerts = state.tours
        .flatMap(tour => tour.concerts)
        .filter(c => !c.isCanceled).length;
      console.log(`[Force Tour] ⚠️  Business rule check: FAILED - ${activeConcerts} active concerts remain`);
    } else {
      console.log('[Force Tour] ⚠️  Business rule check: FAILED - Tour already generated today');
    }
    console.log('[Force Tour] Proceeding anyway for testing purposes...');
  } else {
    console.log('[Force Tour] ✓ Business rule check: PASSED');
  }

  // Authenticate Bluesky client
  console.log('[Force Tour] Authenticating with Bluesky...');
  const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

  try {
    await client.authenticate();
  } catch (error) {
    console.error('[Force Tour] Authentication failed:', error);
    process.exit(1);
  }

  // Generate and announce tour
  console.log('[Force Tour] Generating and announcing tour...');
  try {
    await generateAndAnnounceTour(client, state);

    // Log success details
    const tour = state.tours[state.tours.length - 1];
    const weeks = Math.max(...tour.concerts.map(c => c.weekInTour));
    console.log(`[Force Tour] Generated ${tour.concerts.length}-concert tour of ${tour.continent} (${weeks} weeks)`);
    console.log(`[Force Tour] Date range: ${tour.startDate.toISOString().split('T')[0]} to ${tour.endDate.toISOString().split('T')[0]}`);
    console.log(`[Force Tour] Posted overview: ${tour.overviewPostId}`);
    tour.weeklyPostIds.forEach((postId, index) => {
      console.log(`[Force Tour] Posted week ${index + 1} thread: ${postId}`);
    });
    console.log('[Force Tour] ✓ Tour announced successfully!');
  } catch (error) {
    console.error('[Force Tour] Failed to generate and announce tour:', error);
    process.exit(1);
  }
}

// Run script
forceTour().catch(error => {
  console.error('[Force Tour] Fatal error:', error);
  process.exit(1);
});
