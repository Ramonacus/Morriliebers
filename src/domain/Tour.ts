import { randomUUID } from 'crypto';
import { Continent } from '../types.js';
import { Concert } from './Concert.js';
import { venues } from '../venues.js';

export class Tour {
  readonly id: string;
  readonly continent: Continent;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly announcementDate: Date;
  private _overviewPostId?: string;
  private _weeklyPostIds: string[];
  private _concerts: Concert[];

  constructor(params: {
    id: string;
    continent: Continent;
    startDate: Date;
    endDate: Date;
    announcementDate: Date;
    overviewPostId?: string;
    weeklyPostIds?: string[];
    concerts?: Concert[];
  }) {
    this.id = params.id;
    this.continent = params.continent;
    this.startDate = new Date(params.startDate.getTime());
    this.endDate = new Date(params.endDate.getTime());
    this.announcementDate = new Date(params.announcementDate.getTime());
    this._overviewPostId = params.overviewPostId;
    this._weeklyPostIds = params.weeklyPostIds ? [...params.weeklyPostIds] : [];
    this._concerts = params.concerts ? [...params.concerts] : [];
  }

  get concerts(): readonly Concert[] {
    return this._concerts;
  }

  get overviewPostId(): string | undefined {
    return this._overviewPostId;
  }

  get weeklyPostIds(): readonly string[] {
    return this._weeklyPostIds;
  }

  getConcertsToCancel(now: Date): Concert[] {
    return this._concerts.filter(concert => concert.shouldCancelNow(now));
  }

  hasActiveConcerts(): boolean {
    return this._concerts.some(concert => concert.isActive());
  }

  getWeekCount(): number {
    if (this._concerts.length === 0) {
      return 0;
    }
    return Math.max(...this._concerts.map(c => c.weekInTour));
  }

  addConcert(concert: Concert): void {
    this._concerts.push(concert);
  }

  setAnnouncementPosts(overviewPostId: string, weeklyPostIds: string[]): void {
    this._overviewPostId = overviewPostId;
    this._weeklyPostIds = weeklyPostIds;
  }

  toJSON() {
    return {
      id: this.id,
      continent: this.continent,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      announcementDate: this.announcementDate.toISOString(),
      overviewPostId: this._overviewPostId,
      weeklyPostIds: this._weeklyPostIds,
      concerts: this._concerts.map(c => c.toJSON())
    };
  }

  static fromJSON(data: {
    id: string;
    continent: Continent;
    startDate: string;
    endDate: string;
    announcementDate: string;
    overviewPostId?: string;
    weeklyPostIds: string[];
    concerts: any[];
  }): Tour {
    return new Tour({
      id: data.id,
      continent: data.continent,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      announcementDate: new Date(data.announcementDate),
      overviewPostId: data.overviewPostId,
      weeklyPostIds: data.weeklyPostIds,
      concerts: data.concerts.map(c => Concert.fromJSON(c))
    });
  }

  /**
   * Generate a new tour with concerts
   */
  static generate(referenceDate: Date = new Date()): Tour {
    // 1. Select continent
    const continent = Tour.selectContinent();

    // 2. Select tour length
    const tourLengthWeeks = Tour.selectTourLength();

    // 3. Calculate show count (2-3 per week, random per week)
    let totalShows = 0;
    for (let week = 0; week < tourLengthWeeks; week++) {
      totalShows += Math.random() < 0.5 ? 2 : 3;
    }

    // 4. Select distinct cities
    const cities = Tour.selectDistinctCities(continent, totalShows);

    // 5. Get start date (Monday of week after announcement)
    const tourStartMonday = Tour.getNextWeekMonday(referenceDate);

    // 6. Generate concerts
    const concerts: Concert[] = [];

    // Distribute concerts across the tour period
    for (let i = 0; i < totalShows; i++) {
      const city = cities[i];

      // Find a venue in this city
      const cityVenues = venues.filter(v => v.city === city && v.continent === continent);
      const venue = cityVenues[Math.floor(Math.random() * cityVenues.length)];

      // Calculate which week this concert belongs to (distribute evenly)
      const weekInTour = Math.floor((i / totalShows) * tourLengthWeeks) + 1;

      // Generate date within that week
      const weekStart = new Date(tourStartMonday);
      weekStart.setDate(weekStart.getDate() + ((weekInTour - 1) * 7));
      const dayOffset = Math.floor(Math.random() * 7); // 0-6 days
      const showDate = new Date(weekStart);
      showDate.setDate(showDate.getDate() + dayOffset);

      // Set show time
      const showTime = Tour.generateShowTime();
      showDate.setHours(showTime.hours, showTime.minutes, 0, 0);

      // Generate cancellation date
      const cancellationDate = Tour.generateCancellationDate(showDate);

      concerts.push(new Concert({
        id: randomUUID(),
        venue,
        date: showDate,
        cancellationDate,
        weekInTour,
        isCanceled: false,
      }));
    }

    // Sort concerts by date
    concerts.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Determine actual start and end dates from concerts
    const startDate = concerts[0].date;
    const endDate = concerts[concerts.length - 1].date;

    return new Tour({
      id: randomUUID(),
      continent,
      startDate,
      endDate,
      announcementDate: referenceDate,
      weeklyPostIds: [],
      concerts,
    });
  }

  /**
   * Select a random tour length between 2-4 weeks
   */
  private static selectTourLength(): number {
    return 2 + Math.floor(Math.random() * 3); // Returns 2, 3, or 4
  }

  /**
   * Select continent with weighted probability based on venue counts
   */
  private static selectContinent(): Continent {
    // Count venues per continent
    const counts = new Map<Continent, number>();
    for (const continent of Object.values(Continent)) {
      counts.set(continent, 0);
    }

    for (const venue of venues) {
      const current = counts.get(venue.continent) || 0;
      counts.set(venue.continent, current + 1);
    }

    // Calculate total
    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

    // Select with weighted probability
    const random = Math.random();
    let cumulative = 0;

    for (const [continent, count] of counts.entries()) {
      cumulative += count / total;
      if (random < cumulative) {
        return continent;
      }
    }

    // Fallback (should never reach here)
    return Continent.NorthAmerica;
  }

  /**
   * Select N distinct cities from a continent
   */
  private static selectDistinctCities(continent: Continent, count: number): string[] {
    // Get all unique cities for the continent
    const cities = new Set<string>();
    for (const venue of venues) {
      if (venue.continent === continent) {
        cities.add(venue.city);
      }
    }

    const cityArray = Array.from(cities);

    // Check if we have enough cities
    if (cityArray.length < count) {
      throw new Error(`${continent} only has ${cityArray.length} cities, cannot select ${count}`);
    }

    // Shuffle and select first N cities
    const shuffled = cityArray.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get the Monday of the week after the reference date
   */
  private static getNextWeekMonday(referenceDate: Date): Date {
    const date = new Date(referenceDate);

    // Get to next Monday
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

    date.setDate(date.getDate() + daysUntilNextMonday);
    date.setHours(0, 0, 0, 0);

    return date;
  }

  /**
   * Generate a random show time between 17:00 and 23:30
   */
  private static generateShowTime(): { hours: number; minutes: number } {
    const possibleMinutes = [0, 30];
    const possibleHours = [17, 18, 19, 20, 21, 22, 23];

    const hours = possibleHours[Math.floor(Math.random() * possibleHours.length)];
    const minutes = hours === 23 ? 0 : possibleMinutes[Math.floor(Math.random() * possibleMinutes.length)];

    return { hours, minutes };
  }

  /**
   * Generate cancellation date 20-24 hours before show
   */
  private static generateCancellationDate(showDate: Date): Date {
    const hoursBeforeInt = 20 + Math.floor(Math.random() * 5); // 20-24
    const cancelDate = new Date(showDate);
    cancelDate.setHours(cancelDate.getHours() - hoursBeforeInt);
    return cancelDate;
  }
}
