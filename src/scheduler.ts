import type { Concert, State } from './types.js';

/**
 * Check if current time is Monday between 10:00-14:00 (Spain time)
 * and no announcement has been made this week
 */
export function shouldPostWeeklyAnnouncement(state: State): boolean {
  const now = new Date();

  // Check if it's Monday
  if (now.getDay() !== 1) {
    return false;
  }

  // Check if time is between 10:00-14:00
  const hours = now.getHours();
  if (hours < 10 || hours >= 14) {
    return false;
  }

  // Check if we've already posted this week
  if (state.lastAnnouncementDate) {
    const lastAnnouncementWeek = getWeekStart(state.lastAnnouncementDate);
    const currentWeek = getWeekStart(now);

    if (lastAnnouncementWeek.getTime() === currentWeek.getTime()) {
      // Already posted this week
      return false;
    }
  }

  return true;
}

/**
 * Get concerts that should be canceled now (at or past their cancellation date)
 */
export function getConcertsToCancelNow(concerts: Concert[]): Concert[] {
  const now = new Date();

  return concerts.filter(concert => {
    // Skip already canceled concerts
    if (concert.isCanceled) {
      return false;
    }

    // Check if cancellation time has arrived
    if (concert.cancellationDate && concert.cancellationDate <= now) {
      return true;
    }

    return false;
  });
}

/**
 * Check if any concerts remain for the same week as the given concert
 */
export function hasRemainingConcertsInWeek(canceledConcert: Concert, allConcerts: Concert[]): boolean {
  const weekStart = getWeekStart(canceledConcert.date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return allConcerts.some(concert => {
    // Skip canceled concerts
    if (concert.isCanceled) {
      return false;
    }

    // Check if concert is in the same week
    return concert.date >= weekStart && concert.date < weekEnd;
  });
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
