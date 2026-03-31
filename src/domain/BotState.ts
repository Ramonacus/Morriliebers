import { Tour } from './Tour.js';
import { Concert } from './Concert.js';

export class BotState {
  private _tours: Tour[];
  private _lastTourGenerationDate?: Date;

  constructor(params?: {
    tours?: Tour[];
    lastTourGenerationDate?: Date;
  }) {
    this._tours = params?.tours ?? [];
    this._lastTourGenerationDate = params?.lastTourGenerationDate;
  }

  getTours(): readonly Tour[] {
    return this._tours;
  }

  get lastTourGenerationDate(): Date | undefined {
    return this._lastTourGenerationDate;
  }

  /**
   * Add a tour to the state and update last generation date
   */
  addTour(tour: Tour, generationDate: Date): void {
    this._tours.push(tour);
    this._lastTourGenerationDate = generationDate;
  }

  /**
   * Get all concerts that should be canceled now across all tours
   */
  getAllConcertsToCancel(now: Date): Concert[] {
    const allConcerts: Concert[] = [];

    for (const tour of this._tours) {
      const concertsToCancel = tour.getConcertsToCancel(now);
      allConcerts.push(...concertsToCancel);
    }

    return allConcerts;
  }

  /**
   * Check if a tour should be generated
   * Conditions: 8:00-14:00 UTC, all concerts canceled, no tour generated today
   */
  shouldGenerateTour(now: Date): boolean {
    // Check if time is between 8:00-14:00 UTC
    const hours = now.getUTCHours();
    if (hours < 8 || hours >= 14) {
      return false;
    }

    // Check if any concerts are still active across all tours
    for (const tour of this._tours) {
      if (tour.hasActiveConcerts()) {
        return false;
      }
    }

    // Check if we've already generated a tour today
    if (this._lastTourGenerationDate) {
      const lastGenDate = new Date(this._lastTourGenerationDate);
      const today = new Date(now);

      // Normalize to midnight for comparison
      today.setHours(0, 0, 0, 0);
      lastGenDate.setHours(0, 0, 0, 0);

      if (lastGenDate.getTime() === today.getTime()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      tours: this._tours.map(t => t.toJSON()),
      lastTourGenerationDate: this._lastTourGenerationDate?.toISOString()
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: {
    tours: any[];
    lastTourGenerationDate?: string;
  }): BotState {
    return new BotState({
      tours: data.tours.map(t => Tour.fromJSON(t)),
      lastTourGenerationDate: data.lastTourGenerationDate
        ? new Date(data.lastTourGenerationDate)
        : undefined
    });
  }
}
