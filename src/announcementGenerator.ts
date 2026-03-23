import type { Tour } from './types.js';

/**
 * Generate fallback message when AI generation fails
 */
function getFallbackMessage(tour: Tour): string {
  const startStr = tour.startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const endStr = tour.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });

  const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

  return `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;
}

/**
 * Generate AI announcement for tour (fallback only for now)
 */
export async function generateAnnouncement(tour: Tour): Promise<string> {
  console.log(`[AnnouncementGenerator] Generating announcement for ${tour.continent} tour`);

  // Check if API key is available
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[AnnouncementGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
    return getFallbackMessage(tour);
  }

  // AI generation not implemented yet, use fallback
  console.warn('[AnnouncementGenerator] AI generation not implemented, using fallback');
  return getFallbackMessage(tour);
}
