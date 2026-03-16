import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Concert } from './types.js';

/**
 * Build prompt for Gemini to generate cancellation excuse
 */
function buildPrompt(concert: Concert): string {
  const dateStr = concert.date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });

  return `You are generating a creative cancellation excuse for a Morrissey tribute band called "Morriliebers".

Concert Details:
- Venue: ${concert.venue.name}
- City: ${concert.venue.city}
- Date: ${dateStr}

Style Guidelines:
- Mix of: dramatic/melancholic Morrissey-style, health-related, or absurdist
- MUST include the venue name, city, and date somewhere in the message
- Keep it brief: 1-2 sentences, under 280 characters
- Write the complete cancellation announcement (not just the excuse)
- Be creative with how you integrate the venue/date details

Example styles:
- Dramatic: "The existential weight of performing in ${concert.venue.city} has proven unbearable..."
- Health: "Vocal complications exacerbated by ${concert.venue.city}'s atmospheric conditions..."
- Absurdist: "An urgent matter involving vintage vinyl has made the ${dateStr} concert impossible..."

Generate a creative cancellation message now:`;
}

/**
 * Call Gemini API to generate excuse
 */
async function generateWithGemini(concert: Concert, attempt: number): Promise<string> {
  try {
    console.log(`[ExcuseGenerator] Attempt ${attempt}: Calling Gemini API`);

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: buildPrompt(concert),
      temperature: 1.0,
      maxTokens: 100,
    });

    console.log(`[ExcuseGenerator] Attempt ${attempt} succeeded: ${result.text.substring(0, 50)}...`);
    return result.text;
  } catch (error) {
    console.error(`[ExcuseGenerator] Attempt ${attempt} failed:`, error);
    throw error;
  }
}

/**
 * Generate fallback message when AI generation fails
 */
function getFallbackMessage(concert: Concert): string {
  const dateStr = concert.date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
  });
  return `Morriliebers regrets to announce the cancellation of the concert at ${concert.venue.name} on ${dateStr}`;
}

/**
 * Generate AI excuse for concert cancellation with retry logic
 */
export async function generateExcuse(concert: Concert): Promise<string> {
  console.log(`[ExcuseGenerator] Generating excuse for concert at ${concert.venue.name}`);

  try {
    // Attempt 1
    try {
      return await generateWithGemini(concert, 1);
    } catch (error) {
      console.log('[ExcuseGenerator] Retrying in 1 minute...');

      // Wait 1 minute before retry
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Attempt 2
      return await generateWithGemini(concert, 2);
    }
  } catch (error) {
    console.warn('[ExcuseGenerator] Both attempts failed, using fallback message');
    return getFallbackMessage(concert);
  }
}
