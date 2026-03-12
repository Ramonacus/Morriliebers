# Morriliebers Bluesky Bot Design

**Date:** 2026-03-12
**Status:** Approved

## Overview

An automated Bluesky bot for Morriliebers (a Morrissey tribute band) that announces weekly concerts and then cancels them 20-24 hours before the show. All announcements are in Spanish.

## Requirements

### Functional Requirements
- Generate 1-3 concerts per week for Spanish venues
- Post a single weekly announcement every Monday listing all concerts
- Pin the weekly announcement to the profile
- Cancel concerts 20-24 hours before they occur
- Unpin announcement if all concerts for the week are canceled
- All messages in Spanish

### Concert Scheduling Rules
- Concert days: Wednesday through Sunday only (no Monday/Tuesday)
- Concert times: Every 30 minutes from 17:00-23:30
- No two concerts on the same day
- Maximum 3 concerts per week
- Venues: One venue per 500k inhabitants in Spanish cities (500k+ population)

### Posting Schedule
- **Weekly announcement:** Every Monday, 10:00-14:00
- **Cancellations:** 20-24 hours before concert (random within window)
- **Check interval:** Every 42 minutes

## Technology Stack

- **Runtime:** Node.js v18+
- **Language:** TypeScript
- **Dependencies:**
  - `@atproto/api` - Official Bluesky/AT Protocol SDK
  - `dotenv` - Environment variable management
- **Dev Dependencies:** `typescript`, `@types/node`, `tsx`
- **Process Manager:** pm2 (for production)

## Project Structure

```
morriliebers-bot/
├── src/
│   ├── index.ts              # Main entry point & orchestrator
│   ├── scheduler.ts          # Scheduling logic
│   ├── concertGenerator.ts   # Generates random concerts
│   ├── blueskyClient.ts      # Bluesky API wrapper
│   ├── storage.ts            # JSON file persistence
│   ├── venues.ts             # Venue data & selection
│   └── types.ts              # TypeScript interfaces/types
├── data/
│   └── concerts.json         # Persisted concert state
├── config/
│   └── venues.json           # Static venue list
├── .env                      # Credentials (gitignored)
├── .env.example              # Template for credentials
├── package.json
├── tsconfig.json
└── README.md
```

## Data Model

### Venue
```typescript
interface Venue {
  name: string;
  city: string;
  capacity?: string;  // Optional: "pequeña sala", "teatro", etc.
}
```

### Concert
```typescript
interface Concert {
  id: string;              // UUID
  venue: Venue;            // Full venue object
  date: Date;              // Concert date/time
  announcementDate: Date;  // When it was announced
  postId?: string;         // Bluesky post ID (once posted)
  isPinned: boolean;       // Currently pinned on profile
  isCanceled: boolean;     // Has been canceled
  cancelPostId?: string;   // Cancellation post ID
}
```

### State File (`concerts.json`)
```json
{
  "concerts": [
    {
      "id": "uuid-here",
      "venue": {
        "name": "Sala Apolo",
        "city": "Barcelona"
      },
      "date": "2026-03-15T21:00:00Z",
      "announcementDate": "2026-03-08T12:30:00Z",
      "postId": "at://...",
      "isPinned": true,
      "isCanceled": false
    }
  ],
  "lastAnnouncementDate": "2026-03-08T12:30:00Z"
}
```

## Venue List

Spanish cities with 500k+ population and venue count:
- **Madrid** (~3.3M) → 6-7 venues
- **Barcelona** (~1.6M) → 3 venues
- **Valencia** (~800k) → 1-2 venues
- **Seville** (~690k) → 1 venue
- **Zaragoza** (~675k) → 1 venue

**Total:** ~13-15 well-known music venues suitable for tribute bands (mid-size clubs/theaters)

## Module Design

### `index.ts` - Main Orchestrator
**Responsibilities:**
- Initialize application
- Load environment variables
- Authenticate with Bluesky
- Load concert state
- Run main loop every 42 minutes
- Handle graceful shutdown

**Main Loop:**
```typescript
Every 42 minutes:
  1. Check if it's Monday 10:00-14:00 AND no announcement made this week
     → Generate 1-3 concerts for the week
     → Create and post weekly announcement
     → Pin the announcement
     → Save state

  2. Check all non-canceled concerts
     → For each concert, check if it's 20-24 hours away
     → If yes, post cancellation
     → Mark as canceled in state
     → Check if any concerts remain for that week
     → If none remain, unpin the weekly announcement
     → Save state
```

### `concertGenerator.ts` - Concert Generation
**Responsibilities:**
- Generate 1-3 random concerts for a given week
- Select random venue from venue list
- Assign random day (Wed-Sun)
- Assign random time (17:00-23:30, half-hour intervals)
- Ensure no duplicate days
- Ensure max 3 concerts per week

**Key Functions:**
- `generateWeeklyConcerts(): Concert[]` - Returns 1-3 concerts
- `selectRandomVenue(): Venue` - Picks random venue from list
- `getRandomConcertDate(week: Date): Date` - Random day/time in week
- Validation logic for day uniqueness

### `scheduler.ts` - Scheduling Logic
**Responsibilities:**
- Determine if it's time to post weekly announcement
- Determine if concerts need canceling
- Calculate cancellation time (20-24 hours before, random)

**Key Functions:**
- `shouldPostWeeklyAnnouncement(state: State): boolean` - Check Monday 10:00-14:00
- `getConcertsToCancelNow(concerts: Concert[]): Concert[]` - Find concerts to cancel
- `getRandomCancellationTime(concertDate: Date): Date` - Random time 20-24h before

### `blueskyClient.ts` - Bluesky API Wrapper
**Responsibilities:**
- Authenticate with Bluesky using app password
- Post weekly announcement with all concerts
- Post individual cancellation messages
- Pin/unpin posts
- Session management (re-authenticate if expired)

**Key Functions:**
- `authenticate(): Promise<void>` - Login with credentials
- `postWeeklyAnnouncement(concerts: Concert[]): Promise<string>` - Post and return ID
- `postCancellation(concert: Concert): Promise<string>` - Post cancellation
- `pinPost(postId: string): Promise<void>` - Pin to profile
- `unpinPost(postId: string): Promise<void>` - Unpin from profile
- Error handling with retry logic

**Message Formats:**
- **Weekly announcement:**
  ```
  Próximos conciertos de Morriliebers:

  • Miércoles 15/03 a las 21:00 - Sala Apolo, Barcelona
  • Viernes 17/03 a las 20:30 - Joy Eslava, Madrid
  • Domingo 19/03 a las 19:00 - Loco Club, Valencia
  ```
- **Cancellation:** "Morriliebers lamenta anunciar la cancelación de su concierto en {venue} del día {dd/mm}"

### `storage.ts` - State Persistence
**Responsibilities:**
- Read/write concert state to JSON file
- Atomic writes (temp file + rename)
- Backup corrupted files
- Create initial state if doesn't exist

**Key Functions:**
- `loadState(): Promise<State>` - Load from JSON
- `saveState(state: State): Promise<void>` - Atomic write
- `backupCorruptedState(): void` - Save corrupted file for debugging

### `venues.ts` - Venue Data
**Responsibilities:**
- Store static venue list
- Provide venue selection functionality

**Structure:**
```typescript
export const venues: Venue[] = [
  { name: "Sala Apolo", city: "Barcelona" },
  { name: "Razzmatazz", city: "Barcelona" },
  // ... full list
];

export function getRandomVenue(): Venue;
```

### `types.ts` - Type Definitions
All shared TypeScript interfaces and types.

## Bot Lifecycle

### Startup
1. Load `.env` variables (BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD)
2. Initialize Bluesky client
3. Authenticate with Bluesky
4. Load state from `data/concerts.json` (create if doesn't exist)
5. Start 42-minute interval loop
6. Log "Bot started successfully"

### Main Loop (every 42 minutes)
1. **Check for weekly announcement:**
   - Current time Monday 10:00-14:00?
   - No announcement made this week yet?
   - If yes: generate concerts, post, pin, save state

2. **Check for cancellations:**
   - For each non-canceled concert
   - Is it 20-24 hours away?
   - If yes: post cancellation, update state, check unpinning, save state

### Shutdown
1. Catch SIGINT/SIGTERM
2. Save current state
3. Log "Bot shutting down"
4. Exit cleanly

## Error Handling

### Authentication Errors
- Log error details
- Exit process (requires manual intervention)

### Network/API Errors
- Log error
- Retry once with exponential backoff
- If still fails, log and continue (will retry next cycle)

### File I/O Errors
- If JSON corrupted: backup file, create new empty state, log warning
- If write fails: log error, retry on next cycle

### Rate Limiting
- Respect Bluesky rate limits (unlikely with this frequency)
- Implement backoff if hit

## Logging

**Console logging with timestamps:**
- Bot startup/shutdown
- Weekly announcement posted (with concert count)
- Concert canceled (with venue/date)
- Errors (authentication, posting, file I/O)
- Each main loop iteration (debug level)

**Format:** `[YYYY-MM-DD HH:mm:ss] [LEVEL] Message`

## Configuration

### Environment Variables (`.env`)
```
BLUESKY_IDENTIFIER=username.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### Constants (in code)
- Check interval: 42 minutes
- Weekly posting window: Monday 10:00-14:00
- Concert time slots: 17:00-23:30 (30-min intervals)
- Concert days: Wednesday-Sunday
- Cancellation window: 20-24 hours before
- Max concerts per week: 3
- Min concerts per week: 1

## Deployment

### Development
```bash
npm install
npm run dev  # Uses tsx watch for hot reload
```

### Production
```bash
npm install
npm run build
pm2 start dist/index.js --name morriliebers-bot
pm2 save
```

### Process Management
- Use pm2 for auto-restart on crashes
- Configure pm2 to start on system boot
- Monitor logs: `pm2 logs morriliebers-bot`

## Future Enhancements

Potential improvements (not in scope for initial version):
- Vary cancellation message formats/excuses
- Add images to posts (concert posters)
- Analytics tracking (post engagement)
- Web dashboard for monitoring
- Manual override commands
- Multiple cancellation message templates
- Database instead of JSON (if scaling needed)
