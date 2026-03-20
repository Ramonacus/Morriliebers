import 'dotenv/config';
import { BlueskyClient } from './blueskyClient.js';
import { loadState, saveState } from './storage.js';
import { generateTour } from './tourGenerator.js';
import {
  shouldGenerateTour,
  getConcertsToCancelNow,
} from './scheduler.js';
import type { State } from './types.js';

// Configuration
const CHECK_INTERVAL_MS = 42 * 60 * 1000; // 42 minutes in milliseconds

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Main] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

// Global state
let state: State;
let client: BlueskyClient;

/**
 * Initialize the bot
 */
async function initialize(): Promise<void> {
  console.log('[Main] Starting Morriliebers Bluesky Bot...');

  // Load state
  state = await loadState();
  const totalConcerts = state.tours.reduce((sum, tour) => sum + tour.concerts.length, 0);
  console.log(`[Main] Loaded state with ${state.tours.length} tours (${totalConcerts} concerts)`);

  // Initialize Bluesky client
  client = new BlueskyClient(BLUESKY_IDENTIFIER as string, BLUESKY_APP_PASSWORD as string);
  await client.authenticate();

  console.log('[Main] Bot initialized successfully');
}

/**
 * Handle tour generation and announcement
 */
async function handleTourGeneration(): Promise<void> {
  if (!shouldGenerateTour(state)) {
    return;
  }

  console.log('[Main] Time to generate new tour!');

  try {
    // Generate tour
    const tour = generateTour();
    console.log(`[Main] Generated ${tour.concerts.length}-concert tour of ${tour.continent}`);

    // Post tour announcement (overview + weekly threads)
    const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

    // Update tour with post IDs
    tour.overviewPostId = overviewPostId;
    tour.weeklyPostIds = weeklyPostIds;

    // Update state
    state.tours.push(tour);
    state.lastTourGenerationDate = new Date();

    await saveState(state);

    console.log(`[Main] Tour announcement posted: ${tour.concerts.length} concerts over ${Math.max(...tour.concerts.map(c => c.weekInTour))} weeks`);
  } catch (error) {
    console.error('[Main] Error handling tour generation:', error);
  }
}

/**
 * Handle concert cancellations
 */
async function handleCancellations(): Promise<void> {
  const concertsToCancel = getConcertsToCancelNow(state.tours);

  if (concertsToCancel.length === 0) {
    return;
  }

  console.log(`[Main] Found ${concertsToCancel.length} concerts to cancel`);

  for (const concert of concertsToCancel) {
    try {
      // Post cancellation
      const cancelPostUri = await client.postCancellation(concert);

      // Update concert state
      concert.isCanceled = true;
      concert.cancelPostId = cancelPostUri;

      await saveState(state);

      console.log(`[Main] Canceled concert: ${concert.venue.name}, ${concert.venue.city}`);
    } catch (error) {
      console.error(`[Main] Error canceling concert ${concert.id}:`, error);
    }
  }
}

/**
 * Main loop iteration
 */
async function mainLoop(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n[Main] Loop iteration at ${timestamp}`);

  try {
    // Handle tour generation
    await handleTourGeneration();

    // Handle cancellations
    await handleCancellations();
  } catch (error) {
    console.error('[Main] Error in main loop:', error);
  }

  console.log('[Main] Loop iteration complete');
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  console.log('\n[Main] Shutting down gracefully...');

  try {
    await saveState(state);
    console.log('[Main] State saved');
  } catch (error) {
    console.error('[Main] Error saving state during shutdown:', error);
  }

  console.log('[Main] Bot stopped');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
(async () => {
  try {
    await initialize();

    // Run immediately on startup
    await mainLoop();

    // Then run on interval
    setInterval(mainLoop, CHECK_INTERVAL_MS);

    console.log(`[Main] Bot running, checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  }
})();
