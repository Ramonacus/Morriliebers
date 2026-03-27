import { Continent } from '../types.js';
import { Concert } from './Concert.js';

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
}
