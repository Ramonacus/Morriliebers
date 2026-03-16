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
 * Generate AI excuse for concert cancellation
 */
export async function generateExcuse(concert: Concert): Promise<string> {
  console.log(`[ExcuseGenerator] Generating excuse for concert at ${concert.venue.name}`);

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    prompt: buildPrompt(concert),
    temperature: 1.0,
    maxTokens: 100,
  });

  console.log(`[ExcuseGenerator] Generated: ${result.text.substring(0, 50)}...`);

  return result.text;
}
