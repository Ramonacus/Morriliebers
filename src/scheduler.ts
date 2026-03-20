import type { Concert, State, Tour } from './types.js';

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
