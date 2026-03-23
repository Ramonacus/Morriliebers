import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Tour } from './types.js';

/**
 * Build prompt for Gemini to generate tour announcement
 */
function buildPrompt(tour: Tour): string {
  const startStr = tour.startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const endStr = tour.endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

  return `You are generating a tour announcement for a Morrissey tribute band called "Morriliebers".

Tour Details:
- Continent: ${tour.continent}
- Date Range: ${startStr} - ${endStr}
- Duration: ${weeks} weeks
- Total Shows: ${tour.concerts.length}

Style Guidelines:
- Balanced, professional tone with slight excitement
- Write a legitimate band announcement (not over-the-top or dramatic)
- Contrast with the dramatic/melancholic cancellation excuses
- Keep it brief: 2-4 sentences, under 280 characters
- MUST include: continent, date range, and show count
- Write in English
- Avoid ticket links or specific venue mentions (those go in reply posts)

Example styles:
- "Morriliebers announces their ${weeks}-week ${tour.continent} tour! ${tour.concerts.length} shows from ${startStr} to ${endStr}. Tickets on sale soon."
- "Big news! Morriliebers is hitting ${tour.continent} for ${tour.concerts.length} concerts over ${weeks} weeks. See you on the road!"
- "${tour.continent} tour confirmed! Morriliebers will perform ${tour.concerts.length} shows across ${weeks} weeks starting ${startStr}."

Generate a professional tour announcement now:`;
}

/**
 * Call Gemini API to generate announcement
 */
async function generateWithGemini(tour: Tour, attempt: number): Promise<string> {
  try {
    console.log(`[AnnouncementGenerator] Attempt ${attempt}: Calling Gemini API`);

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: buildPrompt(tour),
      temperature: 1.0,
    });

    console.log(`[AnnouncementGenerator] Attempt ${attempt} succeeded: ${result.text.substring(0, 50)}...`);
    return result.text;
  } catch (error) {
    console.error(`[AnnouncementGenerator] Attempt ${attempt} failed:`, error);
    throw error;
  }
}

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
 * Generate AI announcement for tour with retry logic
 */
export async function generateAnnouncement(tour: Tour): Promise<string> {
  console.log(`[AnnouncementGenerator] Generating announcement for ${tour.continent} tour`);

  // Check if API key is available
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[AnnouncementGenerator] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
    return getFallbackMessage(tour);
  }

  try {
    // Attempt 1
    try {
      return await generateWithGemini(tour, 1);
    } catch (error) {
      console.log('[AnnouncementGenerator] Retrying in 1 minute...');

      // Wait 1 minute before retry
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Attempt 2
      return await generateWithGemini(tour, 2);
    }
  } catch (error) {
    console.warn('[AnnouncementGenerator] Both attempts failed, using fallback message');
    return getFallbackMessage(tour);
  }
}
