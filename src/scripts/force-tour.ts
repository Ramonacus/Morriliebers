import 'dotenv/config';
import { BlueskyClient } from '../blueskyClient.js';
import { loadState, saveState } from '../storage.js';
import { generateTour } from '../tourGenerator.js';
import { canGenerateTour, hasActiveConcerts } from '../scheduler.js';

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

  // Generate tour
  console.log('[Force Tour] Generating tour...');
  const tour = generateTour();
  const weeks = Math.max(...tour.concerts.map(c => c.weekInTour));
  console.log(`[Force Tour] Generated ${tour.concerts.length}-concert tour of ${tour.continent} (${weeks} weeks)`);
  console.log(`[Force Tour] Date range: ${tour.startDate.toISOString().split('T')[0]} to ${tour.endDate.toISOString().split('T')[0]}`);

  // Authenticate Bluesky client
  console.log('[Force Tour] Authenticating with Bluesky...');
  const client = new BlueskyClient(BLUESKY_IDENTIFIER!, BLUESKY_APP_PASSWORD!);

  try {
    await client.authenticate();
  } catch (error) {
    console.error('[Force Tour] Authentication failed:', error);
    process.exit(1);
  }

  // Post tour announcement
  console.log('[Force Tour] Posting tour announcement...');
  try {
    const announcementResult = await client.postTourAnnouncement(tour);

    // Update tour with post IDs
    tour.overviewPostId = announcementResult.overviewPostId;
    tour.weeklyPostIds = announcementResult.weeklyPostIds;

    console.log(`[Force Tour] Posted overview: ${announcementResult.overviewPostId}`);
    announcementResult.weeklyPostIds.forEach((postId, index) => {
      console.log(`[Force Tour] Posted week ${index + 1} thread: ${postId}`);
    });
  } catch (error) {
    console.error('[Force Tour] Failed to post announcement:', error);
    process.exit(1);
  }

  // Update state
  state.tours.push(tour);
  state.lastTourGenerationDate = new Date();

  try {
    await saveState(state);
    console.log('[Force Tour] State saved successfully');
  } catch (error) {
    console.error('[Force Tour] ⚠️  Failed to save state (posts already live):', error);
  }

  console.log('[Force Tour] ✓ Tour announced successfully!');
}

// Run script
forceTour().catch(error => {
  console.error('[Force Tour] Fatal error:', error);
  process.exit(1);
});
