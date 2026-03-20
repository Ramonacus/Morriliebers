import 'dotenv/config';
import { initializeClient, loadAndValidateState, saveAndExit } from './utils.js';
import { generateTour } from '../tourGenerator.js';

export async function announceScript() {
  const client = await initializeClient();
  const state = await loadAndValidateState();

  console.log('[Scripts] Generating new tour...');
  const tour = generateTour();

  const weeks = Math.max(...tour.concerts.map(c => c.weekInTour));
  console.log(`[Scripts] Tour generated: ${weeks} weeks, ${tour.concerts.length} concerts in ${tour.continent}`);

  console.log('[Scripts] Posting tour announcement...');
  const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

  tour.overviewPostId = overviewPostId;
  tour.weeklyPostIds = weeklyPostIds;

  state.tours.push(tour);
  state.lastTourGenerationDate = new Date();

  console.log('[Scripts] Tour announcement posted successfully');

  await saveAndExit(state, 0);
}

// Only run if executed directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  announceScript();
}
