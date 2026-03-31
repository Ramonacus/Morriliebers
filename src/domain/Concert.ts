import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { LLMTextResponseSchema } from '../infrastructure/schemas.js';
import type { Venue } from '../types.js';

export class Concert {
  readonly id: string;
  readonly venue: Venue;
  readonly date: Date;
  readonly cancellationDate: Date;
  readonly weekInTour: number;
  private _isCanceled: boolean;
  private _cancelPostId?: string;

  constructor(params: {
    id: string;
    venue: Venue;
    date: Date;
    cancellationDate: Date;
    weekInTour: number;
    isCanceled?: boolean;
    cancelPostId?: string;
  }) {
    this.id = params.id;
    this.venue = params.venue;
    this.date = params.date;
    this.cancellationDate = params.cancellationDate;
    this.weekInTour = params.weekInTour;
    this._isCanceled = params.isCanceled ?? false;
    this._cancelPostId = params.cancelPostId;
  }

  get isCanceled(): boolean {
    return this._isCanceled;
  }

  get cancelPostId(): string | undefined {
    return this._cancelPostId;
  }

  shouldCancelNow(now: Date): boolean {
    if (this._isCanceled) {
      return false;
    }
    return this.cancellationDate <= now;
  }

  isActive(): boolean {
    return !this._isCanceled;
  }

  markCanceled(postId: string): void {
    this._isCanceled = true;
    this._cancelPostId = postId;
  }

  async cancel(client: { post: (text: string, reply?: any) => Promise<string> }): Promise<void> {
    if (this._isCanceled) {
      throw new Error('Concert is already canceled');
    }

    // Generate excuse text
    const excuseText = await this.generateExcuseText();

    // Post to Bluesky
    const postUri = await client.post(excuseText);

    // Mark as canceled
    this.markCanceled(postUri);
  }

  private async generateExcuseText(): Promise<string> {
    console.log(`[Concert] Generating excuse for concert at ${this.venue.name}`);

    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn('[Concert] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
      return this.getFallbackExcuseMessage();
    }

    try {
      // Attempt 1
      try {
        return await this.generateExcuseWithLLM(1);
      } catch (error) {
        console.log('[Concert] Retrying in 1 minute...');

        // Wait 1 minute before retry
        await new Promise(resolve => setTimeout(resolve, 60000));

        // Attempt 2
        return await this.generateExcuseWithLLM(2);
      }
    } catch (error) {
      console.warn('[Concert] Both attempts failed, using fallback message');
      return this.getFallbackExcuseMessage();
    }
  }

  private async generateExcuseWithLLM(attempt: number): Promise<string> {
    try {
      console.log(`[Concert] Attempt ${attempt}: Calling LLM API`);

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: this.buildExcusePrompt(),
        temperature: 1.0,
      });

      // Validate response
      const validated = LLMTextResponseSchema.parse(result);

      console.log(`[Concert] Attempt ${attempt} succeeded: ${validated.text.substring(0, 50)}...`);
      return validated.text;
    } catch (error) {
      console.error(`[Concert] Attempt ${attempt} failed:`, error);
      throw error;
    }
  }

  private buildExcusePrompt(): string {
    const dateStr = this.date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    });

    return `You are generating a creative cancellation excuse for a Morrissey tribute band called "Morriliebers".

Concert Details:
- Venue: ${this.venue.name}
- City: ${this.venue.city}
- Date: ${dateStr}

Style Guidelines:
- Mix of: dramatic/melancholic Morrissey-style, health-related, or absurdist
- MUST include the venue name, city, and date somewhere in the message
- Keep it brief: 1-2 sentences, under 280 characters
- Write the complete cancellation announcement (not just the excuse)
- Be creative with how you integrate the venue/date details

Example styles:
- Dramatic: "The existential weight of performing in ${this.venue.city} has proven unbearable..."
- Health: "Vocal complications exacerbated by ${this.venue.city}'s atmospheric conditions..."
- Absurdist: "An urgent matter involving vintage vinyl has made the ${dateStr} concert impossible..."

Generate a creative cancellation message now:`;
  }

  private getFallbackExcuseMessage(): string {
    const dateStr = this.date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    });
    return `Morriliebers regrets to announce the cancellation of the concert at ${this.venue.name} on ${dateStr}`;
  }

  toJSON() {
    return {
      id: this.id,
      venue: this.venue,
      date: this.date.toISOString(),
      cancellationDate: this.cancellationDate.toISOString(),
      weekInTour: this.weekInTour,
      isCanceled: this._isCanceled,
      ...(this._cancelPostId !== undefined && { cancelPostId: this._cancelPostId })
    };
  }

  static fromJSON(data: {
    id: string;
    venue: Venue;
    date: string;
    cancellationDate: string;
    weekInTour: number;
    isCanceled: boolean;
    cancelPostId?: string;
  }): Concert {
    const date = new Date(data.date);
    const cancellationDate = new Date(data.cancellationDate);

    if (isNaN(date.getTime()) || isNaN(cancellationDate.getTime())) {
      throw new Error(`Concert.fromJSON: invalid date in data for id=${data.id}`);
    }

    return new Concert({
      id: data.id,
      venue: data.venue,
      date,
      cancellationDate,
      weekInTour: data.weekInTour,
      isCanceled: data.isCanceled,
      cancelPostId: data.cancelPostId
    });
  }
}
