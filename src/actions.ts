import type { BlueskyClient } from './blueskyClient.js';
import type { State, Concert } from './types.js';
import { generateTour } from './tourGenerator.js';
import { saveState } from './storage.js';

/**
 * Generate a tour and announce it on Bluesky
 * Mutates state by adding the tour and updating lastTourGenerationDate
 * Saves state to disk after posting
 *
 * @throws Error if posting to Bluesky fails
 * @throws Error if saving state fails
 */
export async function generateAndAnnounceTour(
  client: BlueskyClient,
  state: State
): Promise<void> {
  // Generate tour
  const tour = generateTour();

  // Post tour announcement (overview + weekly threads)
  const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

  // Update tour with post IDs
  tour.overviewPostId = overviewPostId;
  tour.weeklyPostIds = weeklyPostIds;

  // Update state
  state.tours.push(tour);
  state.lastTourGenerationDate = new Date();

  // Save state
  await saveState(state);
}

/**
 * Cancel a concert by posting to Bluesky and updating state
 * Mutates the concert object by setting isCanceled and cancelPostId
 * Saves state to disk after posting
 *
 * @throws Error if posting to Bluesky fails
 * @throws Error if saving state fails
 */
export async function cancelConcert(
  client: BlueskyClient,
  state: State,
  concert: Concert
): Promise<void> {
  // Post cancellation
  const cancelPostUri = await client.postCancellation(concert);

  // Update concert state
  concert.isCanceled = true;
  concert.cancelPostId = cancelPostUri;

  // Save state
  await saveState(state);
}
