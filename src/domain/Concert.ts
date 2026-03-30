import type { Venue } from '../types.js';
import { generateExcuse } from '../excuseGenerator.js';

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
    return generateExcuse(this);
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
