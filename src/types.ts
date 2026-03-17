/**
 * Venue information for concerts
 */
export interface Venue {
  name: string;
  city: string;
  continent: string;  // "North America", "South America", "Europe", "Asia"
  capacity?: string;
}

/**
 * Concert event with scheduling and state
 */
export interface Concert {
  id: string;                    // UUID
  venue: Venue;                  // Venue details
  date: Date;                    // Concert date/time (in local Spain time)
  announcementDate: Date;        // When it was announced
  cancellationDate?: Date;       // When it should be canceled (20-24h before)
  postId?: string;               // Bluesky post URI (once posted)
  isPinned: boolean;             // Currently pinned on profile
  isCanceled: boolean;           // Has been canceled
  cancelPostId?: string;         // Cancellation post URI
}

/**
 * Persisted application state
 */
export interface State {
  concerts: Concert[];           // All concerts (past and future)
  lastAnnouncementDate?: Date;   // Last Monday announcement date
  weeklyPostId?: string;         // Current week's announcement post ID
}

/**
 * Serializable state for JSON storage
 */
export interface SerializedState {
  concerts: Array<Omit<Concert, 'date' | 'announcementDate' | 'cancellationDate'> & {
    date: string;
    announcementDate: string;
    cancellationDate?: string;
  }>;
  lastAnnouncementDate?: string;
  weeklyPostId?: string;
}
