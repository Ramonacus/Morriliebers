/**
 * Continent enum for venue locations
 */
export enum Continent {
  NorthAmerica = "North America",
  SouthAmerica = "South America",
  Europe = "Europe",
  Asia = "Asia"
}

/**
 * Venue information for concerts
 */
export interface Venue {
  name: string;
  city: string;
  continent: Continent;  // Now uses enum instead of string
  capacity?: string;
}

/**
 * Concert event with scheduling and state
 */
export interface Concert {
  id: string;                    // UUID
  venue: Venue;                  // Venue details
  date: Date;                    // Concert date/time
  cancellationDate: Date;        // When to cancel (20-24h before)
  weekInTour: number;            // Which week: 1, 2, 3, or 4
  isCanceled: boolean;           // Has been canceled
  cancelPostId?: string;         // Cancellation post URI
}

/**
 * Tour spanning 2-4 weeks across a continent
 */
export interface Tour {
  id: string;                    // UUID
  continent: Continent;          // Enum value
  startDate: Date;               // First concert date
  endDate: Date;                 // Last concert date
  announcementDate: Date;        // When tour was announced
  overviewPostId?: string;       // Tour overview post URI
  weeklyPostIds: string[];       // Reply posts for each week [week1, week2, ...]
  concerts: Concert[];           // All concerts in this tour
}

/**
 * Persisted application state
 */
export interface State {
  tours: Tour[];                 // All tours (past and current)
  lastTourGenerationDate?: Date; // Prevent multiple tours per day
}

/**
 * Serializable state for JSON storage
 */
export interface SerializedState {
  tours: Array<{
    id: string;
    continent: Continent;
    startDate: string;
    endDate: string;
    announcementDate: string;
    overviewPostId?: string;
    weeklyPostIds: string[];
    concerts: Array<{
      id: string;
      venue: Venue;
      date: string;
      cancellationDate: string;
      weekInTour: number;
      isCanceled: boolean;
      cancelPostId?: string;
    }>;
  }>;
  lastTourGenerationDate?: string;
}
