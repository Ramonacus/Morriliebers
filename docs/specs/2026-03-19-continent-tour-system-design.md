# Continent-Based Tour System Design

**Date:** 2026-03-19
**Status:** Approved

## Overview

Replace the current weekly concert generation system with continent-based tours that span 2-4 weeks and include multiple cities within a single continent. Tours are generated only after all existing shows are canceled, during morning hours.

## Current System Behavior

- Generates 1-3 concerts per week
- Posts announcements every Monday 10:00-14:00
- Concerts scheduled Wed-Sun only
- Each concert canceled individually 20-24 hours before showtime
- Announcements are pinned, unpinned when all week's concerts are canceled

## New System Behavior

- Generates continent-based tours spanning 2-4 weeks
- 2-3 shows per week throughout the tour
- Tours generated any day of the week, 8:00-14:00
- Only generates new tour when all previous concerts are canceled
- First show scheduled in the week after announcement (never in announcement week)
- Shows can be any day Mon-Sun
- Individual cancellations 20-24 hours before each show
- No pinning/unpinning of posts

## Architecture Changes

### 1. Data Model

#### New Continent Enum

```typescript
enum Continent {
  NorthAmerica = "North America",
  SouthAmerica = "South America",
  Europe = "Europe",
  Asia = "Asia"
}
```

#### New Tour Interface

```typescript
interface Tour {
  id: string;                    // UUID
  continent: Continent;          // Enum value
  startDate: Date;               // First concert date
  endDate: Date;                 // Last concert date
  announcementDate: Date;        // When tour was announced
  overviewPostId?: string;       // Tour overview post URI
  weeklyPostIds: string[];       // Reply posts for each week [week1, week2, ...]
  concerts: Concert[];           // All concerts in this tour
}
```

#### Updated Concert Interface

```typescript
interface Concert {
  id: string;                    // UUID
  venue: Venue;                  // Venue details
  date: Date;                    // Concert date/time
  cancellationDate: Date;        // When to cancel (20-24h before)
  weekInTour: number;            // Which week: 1, 2, 3, or 4
  isCanceled: boolean;           // Has been canceled
  cancelPostId?: string;         // Cancellation post URI
}
```

**Removed from Concert:**
- `isPinned` - No longer using pinning
- `postId` - Replaced by tour-level `overviewPostId`
- `announcementDate` - Moved to tour level

**Added to Concert:**
- `weekInTour` - For grouping concerts into weekly posts

#### Updated Venue Interface

```typescript
interface Venue {
  name: string;
  city: string;
  continent: Continent;          // Now uses enum instead of string
  capacity?: string;
}
```

#### Updated State Interface

```typescript
interface State {
  tours: Tour[];                 // All tours (past and current)
  lastTourGenerationDate?: Date; // Prevent multiple tours per day
}
```

**Removed from State:**
- `concerts: Concert[]` - Now nested within tours
- `lastAnnouncementDate` - Replaced by `lastTourGenerationDate`
- `weeklyPostId` - Replaced by tour-level tracking

#### Serialization

```typescript
interface SerializedState {
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
```

### 2. Tour Generation Logic

#### New Module: `tourGenerator.ts`

Replaces `concertGenerator.ts` with tour-centric generation.

#### Tour Generation Algorithm

1. **Select Continent**
   - Weighted random selection based on venue counts
   - Continents with more venues have higher probability
   - Formula: `P(continent) = venueCount(continent) / totalVenues`

2. **Determine Tour Length**
   - Random 2-4 weeks

3. **Calculate Show Count**
   - For each week: randomly select 2 or 3 shows
   - Total shows: 4-12 concerts (2 weeks × 2 shows minimum, 4 weeks × 3 shows maximum)

4. **Select Cities**
   - Random distinct cities from selected continent
   - No city appears twice in the same tour
   - Each city gets exactly one show
   - Requires: ≥12 cities per continent (validated at startup)

5. **Schedule Shows**
   - First show: Scheduled in Week 1, which starts on the Monday after announcement week
   - Shows distributed across Mon-Sun (all days valid)
   - Show times: 17:00-23:30 in 30-minute intervals
   - Shows sorted chronologically within tour

6. **Generate Cancellation Times**
   - Random time 20-24 hours before each show
   - Same algorithm as current system

#### Key Functions

```typescript
// Validate venue data at module load
validateVenueData(): void
// Throws error if any continent has < 12 cities

// Select continent with weighted probability
selectContinent(): Continent

// Random tour length
selectTourLength(): number // Returns 2, 3, or 4

// Get N unique cities from continent
selectDistinctCities(continent: Continent, count: number): string[]

// Create concert schedule for cities
generateTourSchedule(continent: Continent, cities: string[], weeks: number): Concert[]

// Main entry point
generateTour(referenceDate: Date = new Date()): Tour
```

#### Example Output

**3-week Europe tour:**
- 8 shows across Barcelona, Berlin, Paris, London, Rome, Amsterdam, Madrid, Milan
- Week 1: Barcelona (Wed), Berlin (Fri), Paris (Sun)
- Week 2: London (Tue), Rome (Thu), Amsterdam (Sat)
- Week 3: Madrid (Mon), Milan (Wed)

### 3. Scheduling Logic

#### Updated Module: `scheduler.ts`

#### Tour Generation Check

```typescript
shouldGenerateTour(state: State): boolean
```

**Conditions (all must be true):**
1. Current time is 8:00-14:00 (any day of week)
2. All concerts in all tours are canceled
3. No tour generated today (check `state.lastTourGenerationDate`)

**Returns:** `true` if new tour should be generated

#### Cancellation Check

```typescript
getConcertsToCancelNow(tours: Tour[]): Concert[]
```

**Logic:**
- Iterate all concerts across all tours
- Filter: `!concert.isCanceled && concert.cancellationDate <= now`
- Return flat list of concerts to cancel

#### Utility Functions

```typescript
hasActiveConcerts(tours: Tour[]): boolean
// Returns true if any concert is not canceled

areAllConcertsInTourCanceled(tour: Tour): boolean
// Returns true if all concerts in specific tour are canceled

getNextWeekMonday(referenceDate: Date): Date
// Calculate Monday of week after reference date
```

#### Key Changes from Current System

- Replace Monday-only check with any-day morning window (8:00-14:00)
- Replace weekly announcement logic with tour generation logic
- Remove `hasRemainingConcertsInWeek()` (no longer needed)
- Remove pinning/unpinning logic
- Tour generation waits for complete cancellation of all shows

### 4. Bluesky Posting Logic

#### Updated Module: `blueskyClient.ts`

#### New Method: Tour Announcement

```typescript
postTourAnnouncement(tour: Tour): Promise<{
  overviewPostId: string,
  weeklyPostIds: string[]
}>
```

**Implementation:**
1. Post tour overview with continent and date range
2. For each week in tour, reply to overview with that week's concerts
3. Return all post URIs

**Overview Post Format:**
```
🌍 ¡Gira por [Continent]! 🎸

Morriliebers anuncia su gira de [N] semanas por [Continent]
📅 [startDate] - [endDate]
🎤 [N] conciertos confirmados

Detalles en los comentarios ⬇️
```

**Weekly Reply Post Format:**
```
📍 Semana [N] ([weekStart] - [weekEnd])

[flag] [dayName] [dd/mm] - [HH:mm] - [venue], [city]
[flag] [dayName] [dd/mm] - [HH:mm] - [venue], [city]
...
```

**Example:**
```
📍 Semana 1 (15-21 abril)

🇪🇸 Miércoles 16/04 - 21:00 - Razzmatazz, Barcelona
🇩🇪 Viernes 18/04 - 20:30 - Berghain, Berlin
🇫🇷 Domingo 20/04 - 22:00 - Bataclan, Paris
```

#### Unchanged Method: Cancellation

```typescript
postCancellation(concert: Concert): Promise<string>
```

**Format (unchanged):**
```
Morriliebers lamenta anunciar la cancelación de su concierto en {venue} del día {dd/mm}
```

#### Removed Methods

- `pinPost()` - No longer needed
- `unpinPost()` - No longer needed
- `postWeeklyAnnouncement()` - Replaced by `postTourAnnouncement()`

### 5. Venue Data Expansion

#### Current State

- 60 venues across 30 cities
- North America: 11 cities
- South America: 6 cities
- Europe: 9 cities
- Asia: 4 cities

#### Required Expansion

Minimum 12 cities per continent (max tour = 4 weeks × 3 shows = 12 cities)

#### Cities to Add

**North America:** +1 city
- Seattle or Denver

**South America:** +6 cities
- Lima, Peru
- Montevideo, Uruguay
- Quito, Ecuador
- Caracas, Venezuela
- La Paz, Bolivia
- Asunción, Paraguay

**Europe:** +3 cities
- Lisbon, Portugal
- Amsterdam, Netherlands
- Brussels, Belgium

**Asia:** +8 cities
- Bangkok, Thailand
- Chiang Mai, Thailand
- Singapore
- Hong Kong
- Taipei, Taiwan
- Manila, Philippines
- Fukuoka, Japan
- Sapporo, Japan

#### Venues per City

2 venues per city (following existing pattern)

#### Total New Venues

~36 new venues to add to `config/venues.json`

#### Validation

- `validateVenueData()` runs at startup
- Throws error if any continent has < 12 cities
- Prevents bot from starting with insufficient venue data

### 6. Main Orchestrator Changes

#### Updated Module: `index.ts`

#### Initialization

```typescript
async function initialize(): Promise<void>
```

**Changes:**
- State now loads tours instead of flat concert list
- Venue validation runs automatically via module import

#### Main Loop

```typescript
async function mainLoop(): Promise<void>
```

**Flow:**
1. Check if should generate tour → `shouldGenerateTour(state)`
2. If true: generate tour, post announcement, save state
3. Check for concerts to cancel → `getConcertsToCancelNow(state.tours)`
4. For each concert: post cancellation, mark as canceled, save state

#### Tour Generation Handler

```typescript
async function handleTourGeneration(): Promise<void>
```

**Logic:**
```typescript
if (!shouldGenerateTour(state)) return;

// Generate tour
const tour = generateTour();

// Post announcement (overview + weekly replies)
const { overviewPostId, weeklyPostIds } = await client.postTourAnnouncement(tour);

// Update tour with post IDs
tour.overviewPostId = overviewPostId;
tour.weeklyPostIds = weeklyPostIds;

// Update state
state.tours.push(tour);
state.lastTourGenerationDate = new Date();

await saveState(state);
```

#### Cancellation Handler

```typescript
async function handleCancellations(): Promise<void>
```

**Logic (simplified):**
```typescript
const concertsToCancel = getConcertsToCancelNow(state.tours);

for (const concert of concertsToCancel) {
  const cancelPostUri = await client.postCancellation(concert);
  concert.isCanceled = true;
  concert.cancelPostId = cancelPostUri;
  await saveState(state);
}
```

**Removed:**
- Pin/unpin logic
- Week-based concert tracking

## Migration Considerations

### State File Migration

Existing `data/concerts.json` structure is incompatible with new tour-based structure.

**Options:**
1. **Clean slate:** Archive old state, start fresh
2. **One-time migration:** Convert flat concert list to tours (complex)

**Recommendation:** Clean slate approach
- Simpler implementation
- No legacy data baggage
- Tours are new concept, clean break makes sense

### Testing Strategy

- Update all existing tests to use tour-based structure
- Add new tests for tour generation logic
- Test venue validation
- Test multi-post announcement strategy
- Test scheduling with 8:00-14:00 window

## Implementation Order

1. **Data Model** - Update `types.ts` with new interfaces and Continent enum
2. **Venue Expansion** - Add cities/venues to `config/venues.json`
3. **Venue Validation** - Update `venues.ts` with validation logic
4. **Tour Generator** - Create `tourGenerator.ts` replacing `concertGenerator.ts`
5. **Scheduler** - Update `scheduler.ts` with new tour-based logic
6. **Bluesky Client** - Update `blueskyClient.ts` with multi-post announcement
7. **Storage** - Update `storage.ts` serialization for tour structure
8. **Main Orchestrator** - Update `index.ts` main loop
9. **Tests** - Update all test files for new structure
10. **Manual Scripts** - Update `scripts/announce.ts` and `scripts/cancel-next.ts`

## Success Criteria

- Tours generate only during morning hours (8:00-14:00) when all shows canceled
- Tours span 2-4 weeks with 2-3 shows per week
- Each continent has ≥12 cities
- Continent selection weighted by venue count
- No city appears twice in same tour
- First show scheduled in week after announcement
- Overview post + weekly reply threads posted correctly
- Individual cancellations work as before
- No pinning/unpinning occurs
- Bot prevents multiple tours per day
