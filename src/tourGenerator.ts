import { randomUUID } from 'crypto';
import { Continent, type Tour, type Concert } from './types.js';
import { venues } from './venues.js';

/**
 * Select a random tour length between 2-4 weeks
 */
export function selectTourLength(): number {
  return 2 + Math.floor(Math.random() * 3); // Returns 2, 3, or 4
}

/**
 * Select continent with weighted probability based on venue counts
 */
export function selectContinent(): Continent {
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
export function selectDistinctCities(continent: Continent, count: number): string[] {
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
function getNextWeekMonday(referenceDate: Date): Date {
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
function generateShowTime(): { hours: number; minutes: number } {
  const possibleMinutes = [0, 30];
  const possibleHours = [17, 18, 19, 20, 21, 22, 23];

  const hours = possibleHours[Math.floor(Math.random() * possibleHours.length)];
  const minutes = hours === 23 ? 0 : possibleMinutes[Math.floor(Math.random() * possibleMinutes.length)];

  return { hours, minutes };
}

/**
 * Generate cancellation date 20-24 hours before show
 */
function generateCancellationDate(showDate: Date): Date {
  const hoursBeforeInt = 20 + Math.floor(Math.random() * 5); // 20-24
  const cancelDate = new Date(showDate);
  cancelDate.setHours(cancelDate.getHours() - hoursBeforeInt);
  return cancelDate;
}

/**
 * Main tour generation function
 */
export function generateTour(referenceDate: Date = new Date()): Tour {
  // 1. Select continent
  const continent = selectContinent();

  // 2. Select tour length
  const tourLengthWeeks = selectTourLength();

  // 3. Calculate show count (2-3 per week, random per week)
  let totalShows = 0;
  for (let week = 0; week < tourLengthWeeks; week++) {
    totalShows += Math.random() < 0.5 ? 2 : 3;
  }

  // 4. Select distinct cities
  const cities = selectDistinctCities(continent, totalShows);

  // 5. Get start date (Monday of week after announcement)
  const tourStartMonday = getNextWeekMonday(referenceDate);

  // 6. Generate concerts
  const concerts: Concert[] = [];
  const tourEndDate = new Date(tourStartMonday);
  tourEndDate.setDate(tourEndDate.getDate() + (tourLengthWeeks * 7) - 1);

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
    const showTime = generateShowTime();
    showDate.setHours(showTime.hours, showTime.minutes, 0, 0);

    // Generate cancellation date
    const cancellationDate = generateCancellationDate(showDate);

    concerts.push({
      id: randomUUID(),
      venue,
      date: showDate,
      cancellationDate,
      weekInTour,
      isCanceled: false,
    });
  }

  // Sort concerts by date
  concerts.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Determine actual start and end dates from concerts
  const startDate = concerts[0].date;
  const endDate = concerts[concerts.length - 1].date;

  return {
    id: randomUUID(),
    continent,
    startDate,
    endDate,
    announcementDate: referenceDate,
    weeklyPostIds: [],
    concerts,
  };
}
