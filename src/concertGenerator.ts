import { randomBytes } from 'crypto';
import type { Concert } from './types.js';
import { getRandomVenue } from './venues.js';

/**
 * Generate a random UUID
 */
function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get random day in the week (Wed-Sun only)
 * @returns Day of week: 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
 */
function getRandomConcertDay(): number {
  const validDays = [3, 4, 5, 6, 0]; // Wed, Thu, Fri, Sat, Sun
  return validDays[Math.floor(Math.random() * validDays.length)];
}

/**
 * Get random time slot (17:00-23:30 in 30-minute intervals)
 * @returns Object with hours and minutes
 */
function getRandomTimeSlot(): { hours: number; minutes: number } {
  const slots: Array<{ hours: number; minutes: number }> = [];

  for (let hour = 17; hour <= 23; hour++) {
    slots.push({ hours: hour, minutes: 0 });
    if (hour < 23 || hour === 23) {
      slots.push({ hours: hour, minutes: 30 });
    }
  }

  return slots[Math.floor(Math.random() * slots.length)];
}

/**
 * Generate a random concert date for the current week
 * @param weekStart Monday of the week
 * @param usedDays Days already used (to avoid duplicates)
 * @returns Concert date
 */
function generateConcertDate(weekStart: Date, usedDays: Set<number>): Date {
  // Get random day that hasn't been used
  let dayOfWeek: number;
  let attempts = 0;
  const maxAttempts = 20;

  do {
    dayOfWeek = getRandomConcertDay();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Could not find available day for concert');
    }
  } while (usedDays.has(dayOfWeek));

  // Calculate date
  const concertDate = new Date(weekStart);
  const daysToAdd = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Sunday is 6 days from Monday
  concertDate.setDate(weekStart.getDate() + daysToAdd);

  // Set random time
  const timeSlot = getRandomTimeSlot();
  concertDate.setHours(timeSlot.hours, timeSlot.minutes, 0, 0);

  return concertDate;
}

/**
 * Generate random cancellation time (20-24 hours before concert)
 */
function generateCancellationDate(concertDate: Date): Date {
  const hoursBeforeConcert = 20 + Math.random() * 4; // Random between 20-24 hours
  const cancellationTime = new Date(concertDate);
  cancellationTime.setHours(cancellationTime.getHours() - hoursBeforeConcert);
  return cancellationTime;
}

/**
 * Generate 1-3 concerts for the current week
 * @param referenceDate Date to determine the week (usually current date)
 * @returns Array of concerts
 */
export function generateWeeklyConcerts(referenceDate: Date = new Date()): Concert[] {
  const weekStart = getWeekStart(referenceDate);
  const concertCount = Math.floor(Math.random() * 3) + 1; // 1-3 concerts
  const usedDays = new Set<number>();
  const concerts: Concert[] = [];
  const announcementDate = new Date(); // Current time

  console.log(`[ConcertGenerator] Generating ${concertCount} concerts for week of ${weekStart.toISOString()}`);

  for (let i = 0; i < concertCount; i++) {
    const venue = getRandomVenue();
    const date = generateConcertDate(weekStart, usedDays);
    const cancellationDate = generateCancellationDate(date);

    // Mark day as used
    usedDays.add(date.getDay());

    const concert: Concert = {
      id: generateId(),
      venue,
      date,
      announcementDate,
      cancellationDate,
      isPinned: false,
      isCanceled: false,
    };

    concerts.push(concert);
    console.log(`[ConcertGenerator] Generated concert: ${venue.name}, ${venue.city} on ${date.toISOString()}`);
  }

  // Sort by date
  concerts.sort((a, b) => a.date.getTime() - b.date.getTime());

  return concerts;
}
