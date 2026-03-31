import { randomUUID } from 'crypto';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
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

  /**
   * Announce the tour via Bluesky client
   */
  async announce(client: { createThread: (posts: string[]) => Promise<string[]> }): Promise<void> {
    // 1. Generate AI overview text
    const overviewText = await this.generateAnnouncementText();

    // 2. Group concerts by week
    const concertsByWeek = new Map<number, Concert[]>();
    for (const concert of this._concerts) {
      const week = concert.weekInTour;
      if (!concertsByWeek.has(week)) {
        concertsByWeek.set(week, []);
      }
      concertsByWeek.get(week)!.push(concert);
    }

    // 3. Format weekly posts
    const weeklyTexts: string[] = [];
    const weeks = this.getWeekCount();

    for (let week = 1; week <= weeks; week++) {
      const concerts = concertsByWeek.get(week) || [];
      if (concerts.length === 0) continue;

      // Sort concerts by date within week
      concerts.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate week date range
      const weekStart = concerts[0].date;
      const weekEnd = concerts[concerts.length - 1].date;
      const weekStartStr = weekStart.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long'
      });
      const weekEndStr = weekEnd.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long'
      });

      // Format concert lines with flag emojis
      const flagMap: Record<string, string> = {
        'North America': '🇺🇸',
        'South America': '🇧🇷',
        'Europe': '🇪🇺',
        'Asia': '🇯🇵'
      };
      const flag = flagMap[this.continent] || '🌍';

      const concertLines = concerts
        .map((concert) => {
          const dayName = concert.date.toLocaleDateString('en-GB', {
            weekday: 'long'
          });
          const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          const dateStr = concert.date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit'
          });
          const timeStr = concert.date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          return `${flag} ${dayCapitalized} ${dateStr} - ${timeStr} - ${concert.venue.name}, ${concert.venue.city}`;
        })
        .join('\n');

      const weekText = `📍 Week ${week} (${weekStartStr} - ${weekEndStr})

${concertLines}`;

      weeklyTexts.push(weekText);
    }

    // 4. Create thread via client
    const postUris = await client.createThread([overviewText, ...weeklyTexts]);

    // 5. Update internal state
    this.setAnnouncementPosts(postUris[0], postUris.slice(1));
  }

  /**
   * Generate AI announcement text with retry logic
   */
  private async generateAnnouncementText(): Promise<string> {
    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn('[Tour] GOOGLE_GENERATIVE_AI_API_KEY not set, using fallback');
      return this.getFallbackAnnouncementText();
    }

    try {
      // Attempt 1
      try {
        return await this.generateWithGemini(1);
      } catch (error) {
        console.log('[Tour] Retrying in 1 minute...');

        // Wait 1 minute before retry
        await new Promise(resolve => setTimeout(resolve, 60000));

        // Attempt 2
        return await this.generateWithGemini(2);
      }
    } catch (error) {
      console.warn('[Tour] Both attempts failed, using fallback message');
      return this.getFallbackAnnouncementText();
    }
  }

  /**
   * Call Gemini API to generate announcement
   */
  private async generateWithGemini(attempt: number): Promise<string> {
    try {
      console.log(`[Tour] Attempt ${attempt}: Calling Gemini API`);

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: this.buildAnnouncementPrompt(),
        temperature: 1.0,
      });

      console.log(`[Tour] Attempt ${attempt} succeeded: ${result.text.substring(0, 50)}...`);
      return result.text;
    } catch (error) {
      console.error(`[Tour] Attempt ${attempt} failed:`, error);
      throw error;
    }
  }

  /**
   * Build prompt for Gemini to generate tour announcement
   */
  private buildAnnouncementPrompt(): string {
    const startStr = this.startDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    });
    const endStr = this.endDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    });
    const weeks = this.getWeekCount();

    return `You are generating a tour announcement for a Morrissey tribute band called "Morriliebers".

Tour Details:
- Continent: ${this.continent}
- Date Range: ${startStr} - ${endStr}
- Duration: ${weeks} weeks
- Total Shows: ${this._concerts.length}

Style Guidelines:
- Balanced, professional tone with slight excitement
- Write a legitimate band announcement (not over-the-top or dramatic)
- Contrast with the dramatic/melancholic cancellation excuses
- Keep it brief: 2-4 sentences, under 280 characters
- MUST include: continent, date range, and show count
- Write in English
- Avoid ticket links or specific venue mentions (those go in reply posts)

Example styles:
- "Morriliebers announces their ${weeks}-week ${this.continent} tour! ${this._concerts.length} shows from ${startStr} to ${endStr}. Tickets on sale soon."
- "Big news! Morriliebers is hitting ${this.continent} for ${this._concerts.length} concerts over ${weeks} weeks. See you on the road!"
- "${this.continent} tour confirmed! Morriliebers will perform ${this._concerts.length} shows across ${weeks} weeks starting ${startStr}."

Generate a professional tour announcement now:`;
  }

  /**
   * Generate fallback message when AI generation fails
   */
  private getFallbackAnnouncementText(): string {
    const startStr = this.startDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    });
    const endStr = this.endDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    });

    const weeks = this.getWeekCount();

    return `🌍 ¡${this.continent} Tour Coming up! 🎸

Morriliebers will be touring ${this.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${this._concerts.length} shows

Details in comments ⬇️`;
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
