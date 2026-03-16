import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Concert } from './types.js';

export async function generateExcuse(concert: Concert): Promise<string> {
  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    prompt: `Generate excuse for ${concert.venue.name}`,
    temperature: 1.0,
    maxTokens: 100,
  });

  return result.text;
}
