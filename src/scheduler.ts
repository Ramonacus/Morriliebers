import type { Concert, State, Tour } from './types.js';

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
 * Accepts either a flat array of concerts or an array of tours
 */
export function getConcertsToCancelNow(concertsOrTours: Concert[] | Tour[]): Concert[] {
  const now = new Date();

  // Determine if we're working with tours or concerts
  let concerts: Concert[];
  if (concertsOrTours.length === 0) {
    return [];
  }

  // Check if first item is a Tour (has 'concerts' property)
  if ('concerts' in concertsOrTours[0]) {
    // Extract concerts from all tours
    concerts = (concertsOrTours as Tour[]).flatMap(tour => tour.concerts);
  } else {
    // Already a flat concert array
    concerts = concertsOrTours as Concert[];
  }

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

/**
 * Check if any concerts are active (not canceled) across all tours
 */
export function hasActiveConcerts(tours: Tour[]): boolean {
  for (const tour of tours) {
    for (const concert of tour.concerts) {
      if (!concert.isCanceled) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a tour should be generated
 * Conditions: 8:00-14:00, all concerts canceled, no tour generated today
 */
export function shouldGenerateTour(state: State): boolean {
  const now = new Date();

  // Check if time is between 8:00-14:00
  const hours = now.getHours();
  if (hours < 8 || hours >= 14) {
    return false;
  }

  // Check if any concerts are still active
  if (hasActiveConcerts(state.tours)) {
    return false;
  }

  // Check if we've already generated a tour today
  if (state.lastTourGenerationDate) {
    const lastGenDate = new Date(state.lastTourGenerationDate);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    lastGenDate.setHours(0, 0, 0, 0);

    if (lastGenDate.getTime() === today.getTime()) {
      return false;
    }
  }

  return true;
}
