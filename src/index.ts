import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BlueskyClient } from './infrastructure/BlueskyClient.js';
import { StateRepository } from './infrastructure/StateRepository.js';
import { BotState } from './domain/BotState.js';
import { Tour } from './domain/Tour.js';

// Configuration
const CHECK_INTERVAL_MS = 42 * 60 * 1000; // 42 minutes in milliseconds

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATE_FILE = join(__dirname, '..', 'data', 'concerts.json');

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Main] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

// Global state
let state: BotState;
let repository: StateRepository;
let client: BlueskyClient;

/**
 * Initialize the bot
 */
async function initialize(): Promise<void> {
  console.log('[Main] Starting Morriliebers Bluesky Bot...');

  // Initialize repository and load state
  repository = new StateRepository(STATE_FILE);
  state = await repository.load();

  const totalConcerts = state.getTours().reduce(
    (sum, tour) => sum + tour.concerts.length,
    0
  );
  console.log(
    `[Main] Loaded state with ${state.getTours().length} tours (${totalConcerts} concerts)`
  );

  // Initialize Bluesky client
  client = new BlueskyClient(
    BLUESKY_IDENTIFIER as string,
    BLUESKY_APP_PASSWORD as string
  );
  await client.authenticate();

  console.log('[Main] Bot initialized successfully');
}

/**
 * Handle tour generation and announcement
 */
async function handleTourGeneration(): Promise<void> {
  const now = new Date();

  if (!state.shouldGenerateTour(now)) {
    return;
  }

  console.log('[Main] Time to generate new tour!');

  try {
    // Generate tour
    const tour = Tour.generate(now);

    // Announce tour
    await tour.announce(client);

    // Add to state and save
    state.addTour(tour, now);
    await repository.save(state);

    console.log(
      `[Main] Tour announcement posted: ${tour.concerts.length} concerts over ${tour.getWeekCount()} weeks`
    );
  } catch (error) {
    console.error('[Main] Error handling tour generation:', error);
  }
}

/**
 * Handle concert cancellations
 */
async function handleCancellations(): Promise<void> {
  const now = new Date();
  const concertsToCancel = state.getAllConcertsToCancel(now);

  if (concertsToCancel.length === 0) {
    return;
  }

  console.log(`[Main] Found ${concertsToCancel.length} concerts to cancel`);

  for (const concert of concertsToCancel) {
    try {
      await concert.cancel(client);
      await repository.save(state);
      console.log(
        `[Main] Canceled concert: ${concert.venue.name}, ${concert.venue.city}`
      );
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
    await repository.save(state);
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

    console.log(
      `[Main] Bot running, checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`
    );
  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  }
})();
