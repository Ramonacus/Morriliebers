import 'dotenv/config';
import { initializeClient, loadAndValidateState, saveAndExit } from './utils.js';
import { generateWeeklyConcerts } from '../concertGenerator.js';

/**
 * Main function to generate and announce weekly concerts
 */
export async function runAnnounce(): Promise<void> {
  try {
    console.log('[Announce] Starting manual announcement...');

    // Initialize
    const client = await initializeClient();
    const state = await loadAndValidateState();

    // Generate concerts
    const concerts = generateWeeklyConcerts();
    console.log(`[Announce] Generated ${concerts.length} concerts`);

    // Post announcement
    const postUri = await client.postWeeklyAnnouncement(concerts);

    // Pin the post
    await client.pinPost(postUri);

    // Update state
    concerts.forEach(concert => {
      concert.postId = postUri;
      concert.isPinned = true;
    });

    state.concerts.push(...concerts);
    state.lastAnnouncementDate = new Date();
    state.weeklyPostId = postUri;

    console.log('[Announce] Posted and pinned announcement');

    // Save and exit
    await saveAndExit(state, 0);
  } catch (error) {
    console.error('[Announce] Failed to announce concerts');
    await saveAndExit({ concerts: [] }, 1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnnounce();
}
