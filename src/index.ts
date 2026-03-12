import 'dotenv/config';
import { BlueskyClient } from './blueskyClient.js';
import { loadState, saveState } from './storage.js';
import { generateWeeklyConcerts } from './concertGenerator.js';
import {
  shouldPostWeeklyAnnouncement,
  getConcertsToCancelNow,
  hasRemainingConcertsInWeek,
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
  console.log(`[Main] Loaded state with ${state.concerts.length} concerts`);

  // Initialize Bluesky client
  client = new BlueskyClient(BLUESKY_IDENTIFIER as string, BLUESKY_APP_PASSWORD as string);
  await client.authenticate();

  console.log('[Main] Bot initialized successfully');
}

/**
 * Handle weekly announcement posting
 */
async function handleWeeklyAnnouncement(): Promise<void> {
  if (!shouldPostWeeklyAnnouncement(state)) {
    return;
  }

  console.log('[Main] Time to post weekly announcement!');

  try {
    // Generate concerts for the week
    const concerts = generateWeeklyConcerts();

    // Post announcement
    const postUri = await client.postWeeklyAnnouncement(concerts);

    // Pin the announcement
    await client.pinPost(postUri);

    // Update state
    concerts.forEach(concert => {
      concert.postId = postUri;
      concert.isPinned = true;
    });

    state.concerts.push(...concerts);
    state.lastAnnouncementDate = new Date();
    state.weeklyPostId = postUri;

    await saveState(state);

    console.log(`[Main] Posted and pinned ${concerts.length} concerts`);
  } catch (error) {
    console.error('[Main] Error handling weekly announcement:', error);
  }
}

/**
 * Handle concert cancellations
 */
async function handleCancellations(): Promise<void> {
  const concertsToCancel = getConcertsToCancelNow(state.concerts);

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

      // Check if we should unpin the weekly announcement
      if (!hasRemainingConcertsInWeek(concert, state.concerts)) {
        console.log('[Main] No remaining concerts this week, unpinning announcement');
        await client.unpinPost();

        // Update all concerts in this week to reflect unpinned status
        const weekStart = getWeekStart(concert.date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        state.concerts.forEach(c => {
          if (c.date >= weekStart && c.date < weekEnd) {
            c.isPinned = false;
          }
        });
      }

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
    // Handle weekly announcement
    await handleWeeklyAnnouncement();

    // Handle cancellations
    await handleCancellations();
  } catch (error) {
    console.error('[Main] Error in main loop:', error);
  }

  console.log('[Main] Loop iteration complete');
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
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
