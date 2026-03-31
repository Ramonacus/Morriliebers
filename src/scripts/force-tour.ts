import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BlueskyClient } from '../infrastructure/BlueskyClient.js';
import { StateRepository } from '../infrastructure/StateRepository.js';
import { Tour } from '../domain/Tour.js';

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATE_FILE = join(__dirname, '..', '..', 'data', 'concerts.json');

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
  const repository = new StateRepository(STATE_FILE);
  const state = await repository.load();

  const totalConcerts = state.getTours().reduce(
    (sum, tour) => sum + tour.concerts.length,
    0
  );
  console.log(
    `[Force Tour] Loaded ${state.getTours().length} tours (${totalConcerts} concerts total)`
  );

  // Check business rules (advisory only)
  const hasActiveConcerts = state.getTours().some(tour => tour.hasActiveConcerts());

  if (hasActiveConcerts) {
    const activeConcerts = state
      .getTours()
      .flatMap(tour => tour.concerts)
      .filter(c => c.isActive()).length;
    console.log(
      `[Force Tour] ⚠️  Business rule check: FAILED - ${activeConcerts} active concerts remain`
    );
    console.log('[Force Tour] Proceeding anyway for testing purposes...');
  } else if (state.lastTourGenerationDate) {
    const lastGenDate = new Date(state.lastTourGenerationDate);
    const today = new Date();
    lastGenDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (lastGenDate.getTime() === today.getTime()) {
      console.log('[Force Tour] ⚠️  Business rule check: FAILED - Tour already generated today');
      console.log('[Force Tour] Proceeding anyway for testing purposes...');
    } else {
      console.log('[Force Tour] ✓ Business rule check: PASSED');
    }
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
    const now = new Date();
    const tour = Tour.generate(now);

    await tour.announce(client);

    state.addTour(tour, now);
    await repository.save(state);

    // Log success details
    console.log(
      `[Force Tour] Generated ${tour.concerts.length}-concert tour of ${tour.continent} (${tour.getWeekCount()} weeks)`
    );
    console.log(
      `[Force Tour] Date range: ${tour.startDate.toISOString().split('T')[0]} to ${tour.endDate.toISOString().split('T')[0]}`
    );
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
