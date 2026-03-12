# Morriliebers Bluesky Bot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated Bluesky bot that announces weekly concerts and cancels them 20-24 hours before showtime.

**Architecture:** Modular TypeScript application with separate concerns - concert generation, scheduling logic, Bluesky API integration, and JSON persistence. Main orchestrator runs a 42-minute check loop.

**Tech Stack:** Node.js, TypeScript, @atproto/api (Bluesky SDK), dotenv

---

## File Structure

**New files to create in current directory:**
```
./                             # Working directory: /Users/rferrer/Workspace/ramonacus/Morriliebers
├── src/
│   ├── types.ts              # TypeScript interfaces
│   ├── venues.ts             # Venue data & selection
│   ├── storage.ts            # JSON persistence
│   ├── concertGenerator.ts   # Concert generation
│   ├── blueskyClient.ts      # Bluesky API wrapper
│   ├── scheduler.ts          # Scheduling logic
│   └── index.ts              # Main orchestrator
├── config/
│   └── venues.json           # Static venue list
├── data/                     # Created at runtime
│   └── concerts.json         # State persistence
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
└── README.md
```

**Responsibilities:**
- `types.ts`: Shared TypeScript interfaces (Venue, Concert, State)
- `venues.ts`: Venue list, random selection logic
- `storage.ts`: Read/write concerts.json with atomic operations
- `concertGenerator.ts`: Generate 1-3 random concerts per week
- `blueskyClient.ts`: Authenticate, post, pin/unpin
- `scheduler.ts`: Determine when to post/cancel
- `index.ts`: Main loop, orchestrates all modules

---

## Chunk 1: Project Setup & Type Definitions

### Task 1: Initialize TypeScript Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Verify working directory**

Run: `pwd`
Expected: Should be in /Users/rferrer/Workspace/ramonacus/Morriliebers

- [ ] **Step 2: Create package.json**

```json
{
  "name": "morriliebers-bot",
  "version": "1.0.0",
  "description": "Automated Bluesky bot for Morriliebers concert announcements",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"Error: no test command yet\" && exit 0"
  },
  "keywords": ["bluesky", "bot", "morrissey"],
  "author": "Ramon Ferrer <ramonacus@gmail.com>",
  "license": "MIT",
  "dependencies": {
    "@atproto/api": "^0.12.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
# Dependencies
node_modules/

# Build output
dist/

# Environment
.env

# State files
data/concerts.json

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

- [ ] **Step 6: Commit project setup**

```bash
git add package.json tsconfig.json .gitignore
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "chore: initialize TypeScript project

Set up package.json with dependencies, tsconfig, and gitignore

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 2: Define Type System

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create src directory**

Run: `mkdir -p src`
Expected: Directory created

- [ ] **Step 2: Create types.ts with core interfaces**

```typescript
/**
 * Venue information for concerts
 */
export interface Venue {
  name: string;
  city: string;
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
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit type definitions**

```bash
git add src/types.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add core type definitions

Define Venue, Concert, and State interfaces

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 3: Create Venue Data

**Files:**
- Create: `config/venues.json`
- Create: `src/venues.ts`

- [ ] **Step 1: Create config directory**

Run: `mkdir -p config`
Expected: Directory created

- [ ] **Step 2: Create venues.json with Spanish venue list**

```json
[
  {
    "name": "Sala Apolo",
    "city": "Barcelona"
  },
  {
    "name": "Razzmatazz",
    "city": "Barcelona"
  },
  {
    "name": "Sala BARTS",
    "city": "Barcelona"
  },
  {
    "name": "Joy Eslava",
    "city": "Madrid"
  },
  {
    "name": "Sala Riviera",
    "city": "Madrid"
  },
  {
    "name": "WiZink Center",
    "city": "Madrid"
  },
  {
    "name": "La Riviera",
    "city": "Madrid"
  },
  {
    "name": "Sala But",
    "city": "Madrid"
  },
  {
    "name": "Café Berlín",
    "city": "Madrid"
  },
  {
    "name": "Loco Club",
    "city": "Valencia"
  },
  {
    "name": "Sala Moon",
    "city": "Valencia"
  },
  {
    "name": "Sala Custom",
    "city": "Sevilla"
  },
  {
    "name": "Sala López",
    "city": "Zaragoza"
  }
]
```

- [ ] **Step 3: Create venues.ts module**

```typescript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Venue } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load venues from config file
 */
function loadVenues(): Venue[] {
  const venuesPath = join(__dirname, '..', 'config', 'venues.json');
  const data = readFileSync(venuesPath, 'utf-8');
  return JSON.parse(data) as Venue[];
}

/**
 * All available venues for concerts
 */
export const venues: Venue[] = loadVenues();

/**
 * Select a random venue from the list
 */
export function getRandomVenue(): Venue {
  const randomIndex = Math.floor(Math.random() * venues.length);
  return venues[randomIndex];
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit venue data and module**

```bash
git add config/venues.json src/venues.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add venue data and selection logic

13 venues across Madrid, Barcelona, Valencia, Sevilla, and Zaragoza

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Storage & State Management

### Task 4: Implement Storage Module

**Files:**
- Create: `src/storage.ts`

- [ ] **Step 1: Create storage.ts with read/write functions**

```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { State, SerializedState, Concert } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const STATE_FILE = join(DATA_DIR, 'concerts.json');

/**
 * Serialize state for JSON storage (convert Dates to ISO strings)
 */
function serializeState(state: State): SerializedState {
  return {
    concerts: state.concerts.map(concert => ({
      ...concert,
      date: concert.date.toISOString(),
      announcementDate: concert.announcementDate.toISOString(),
      cancellationDate: concert.cancellationDate?.toISOString(),
    })),
    lastAnnouncementDate: state.lastAnnouncementDate?.toISOString(),
    weeklyPostId: state.weeklyPostId,
  };
}

/**
 * Deserialize state from JSON storage (convert ISO strings to Dates)
 */
function deserializeState(serialized: SerializedState): State {
  return {
    concerts: serialized.concerts.map(concert => ({
      ...concert,
      date: new Date(concert.date),
      announcementDate: new Date(concert.announcementDate),
      cancellationDate: concert.cancellationDate ? new Date(concert.cancellationDate) : undefined,
    })),
    lastAnnouncementDate: serialized.lastAnnouncementDate
      ? new Date(serialized.lastAnnouncementDate)
      : undefined,
    weeklyPostId: serialized.weeklyPostId,
  };
}

/**
 * Load state from JSON file, create empty if doesn't exist
 */
export async function loadState(): Promise<State> {
  try {
    // Create data directory if it doesn't exist
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    // Return empty state if file doesn't exist
    if (!existsSync(STATE_FILE)) {
      console.log('[Storage] No state file found, creating new state');
      const emptyState: State = { concerts: [] };
      await saveState(emptyState);
      return emptyState;
    }

    // Read and parse state file
    const data = await readFile(STATE_FILE, 'utf-8');
    const serialized = JSON.parse(data) as SerializedState;
    return deserializeState(serialized);
  } catch (error) {
    console.error('[Storage] Error loading state:', error);

    // Backup corrupted file
    if (existsSync(STATE_FILE)) {
      const backupPath = `${STATE_FILE}.backup-${Date.now()}`;
      console.log(`[Storage] Backing up corrupted state to ${backupPath}`);
      try {
        await writeFile(backupPath, await readFile(STATE_FILE));
      } catch (backupError) {
        console.error('[Storage] Failed to backup corrupted state:', backupError);
      }
    }

    // Return empty state
    console.log('[Storage] Returning empty state');
    return { concerts: [] };
  }
}

/**
 * Save state to JSON file atomically
 */
export async function saveState(state: State): Promise<void> {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    // Serialize state
    const serialized = serializeState(state);
    const json = JSON.stringify(serialized, null, 2);

    // Atomic write: write to temp file, then rename
    const tempFile = `${STATE_FILE}.tmp`;
    await writeFile(tempFile, json, 'utf-8');
    await writeFile(STATE_FILE, json, 'utf-8'); // Node.js doesn't have atomic rename cross-platform, so we just overwrite

    console.log('[Storage] State saved successfully');
  } catch (error) {
    console.error('[Storage] Error saving state:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Compile and test storage manually**

Compile TypeScript:
Run: `npx tsc`
Expected: Creates dist/ directory with compiled JavaScript

Create a test script `test-storage.mjs`:
```javascript
import { loadState, saveState } from './dist/storage.js';

const state = await loadState();
console.log('Loaded state:', state);

state.concerts.push({
  id: 'test-123',
  venue: { name: 'Test Venue', city: 'Test City' },
  date: new Date(),
  announcementDate: new Date(),
  isPinned: false,
  isCanceled: false,
});

await saveState(state);
console.log('Saved state');

const reloaded = await loadState();
console.log('Reloaded state:', reloaded);
```

Run test:
Run: `node test-storage.mjs`
Expected: Creates data/concerts.json, logs state with test concert

Clean up:
Run: `rm test-storage.mjs`

- [ ] **Step 4: Commit storage module**

```bash
git add src/storage.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add state persistence with atomic writes

JSON storage with date serialization and error recovery

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Concert Generation Logic

### Task 5: Implement Concert Generator

**Files:**
- Create: `src/concertGenerator.ts`

- [ ] **Step 1: Create concertGenerator.ts with generation logic**

```typescript
import { randomBytes } from 'crypto';
import type { Concert, Venue } from './types.js';
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Compile and test concert generation manually**

Compile TypeScript:
Run: `npx tsc`
Expected: Updates dist/ directory

Create test script `test-generator.mjs`:
```javascript
import { generateWeeklyConcerts } from './dist/concertGenerator.js';

console.log('Generating concerts...\n');

for (let i = 0; i < 3; i++) {
  const concerts = generateWeeklyConcerts();
  console.log(`\nRun ${i + 1}: Generated ${concerts.length} concerts`);
  concerts.forEach(c => {
    console.log(`  - ${c.venue.name} (${c.venue.city}) on ${c.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    console.log(`    Cancels at: ${c.cancellationDate?.toLocaleString('es-ES')}`);
  });
}
```

Run test:
Run: `node test-generator.mjs`
Expected: Generates concerts on Wed-Sun, times 17:00-23:30, no duplicate days

Clean up:
Run: `rm test-generator.mjs`

- [ ] **Step 4: Commit concert generator**

```bash
git add src/concertGenerator.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add concert generation logic

Generates 1-3 random concerts per week (Wed-Sun, 17:00-23:30)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Bluesky Integration

### Task 6: Implement Bluesky Client

**Files:**
- Create: `src/blueskyClient.ts`

- [ ] **Step 1: Create blueskyClient.ts with authentication**

```typescript
import { BskyAgent } from '@atproto/api';
import type { Concert } from './types.js';

export class BlueskyClient {
  private agent: BskyAgent;
  private identifier: string;
  private password: string;

  constructor(identifier: string, password: string) {
    this.agent = new BskyAgent({ service: 'https://bsky.social' });
    this.identifier = identifier;
    this.password = password;
  }

  /**
   * Authenticate with Bluesky
   */
  async authenticate(): Promise<void> {
    try {
      console.log('[Bluesky] Authenticating...');
      await this.agent.login({
        identifier: this.identifier,
        password: this.password,
      });
      console.log('[Bluesky] Authentication successful');
    } catch (error) {
      console.error('[Bluesky] Authentication failed:', error);
      throw new Error('Failed to authenticate with Bluesky');
    }
  }

  /**
   * Format concert for announcement
   */
  private formatConcertLine(concert: Concert): string {
    const dayName = concert.date.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dateStr = concert.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const timeStr = concert.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    return `• ${dayCapitalized} ${dateStr} a las ${timeStr} - ${concert.venue.name}, ${concert.venue.city}`;
  }

  /**
   * Post weekly announcement with all concerts
   * @returns Post URI
   */
  async postWeeklyAnnouncement(concerts: Concert[]): Promise<string> {
    try {
      console.log('[Bluesky] Posting weekly announcement...');

      const concertLines = concerts.map(c => this.formatConcertLine(c)).join('\n');
      const text = `Próximos conciertos de Morriliebers:\n\n${concertLines}`;

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log('[Bluesky] Weekly announcement posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post announcement:', error);
      throw error;
    }
  }

  /**
   * Post cancellation announcement
   * @returns Post URI
   */
  async postCancellation(concert: Concert): Promise<string> {
    try {
      console.log('[Bluesky] Posting cancellation...');

      const dateStr = concert.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const text = `Morriliebers lamenta anunciar la cancelación de su concierto en ${concert.venue.name} del día ${dateStr}`;

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log('[Bluesky] Cancellation posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post cancellation:', error);
      throw error;
    }
  }

  /**
   * Pin a post to the profile
   */
  async pinPost(postUri: string): Promise<void> {
    try {
      console.log('[Bluesky] Pinning post...');

      // Get current profile
      const profile = await this.agent.getProfile({ actor: this.agent.session?.did || '' });

      // Update preferences to pin the post
      await this.agent.api.app.bsky.actor.profile.create(
        { repo: this.agent.session?.did || '' },
        {
          ...profile.data,
          pinnedPost: postUri,
        }
      );

      console.log('[Bluesky] Post pinned');
    } catch (error) {
      console.error('[Bluesky] Failed to pin post:', error);
      // Non-fatal error, continue
    }
  }

  /**
   * Unpin the current pinned post
   */
  async unpinPost(): Promise<void> {
    try {
      console.log('[Bluesky] Unpinning post...');

      // Get current profile
      const profile = await this.agent.getProfile({ actor: this.agent.session?.did || '' });

      // Update preferences to remove pinned post
      await this.agent.api.app.bsky.actor.profile.create(
        { repo: this.agent.session?.did || '' },
        {
          ...profile.data,
          pinnedPost: undefined,
        }
      );

      console.log('[Bluesky] Post unpinned');
    } catch (error) {
      console.error('[Bluesky] Failed to unpin post:', error);
      // Non-fatal error, continue
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit Bluesky client**

```bash
git add src/blueskyClient.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add Bluesky API client

Authentication, posting announcements/cancellations, and pinning

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Scheduling Logic

### Task 7: Implement Scheduler

**Files:**
- Create: `src/scheduler.ts`

- [ ] **Step 1: Create scheduler.ts with scheduling logic**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Compile and test scheduler logic manually**

Compile TypeScript:
Run: `npx tsc`
Expected: Updates dist/ directory

Create test script `test-scheduler.mjs`:
```javascript
import { shouldPostWeeklyAnnouncement, getConcertsToCancelNow, hasRemainingConcertsInWeek } from './dist/scheduler.js';

// Test shouldPostWeeklyAnnouncement
console.log('Testing shouldPostWeeklyAnnouncement...');
const state1 = { concerts: [] };
console.log('Empty state:', shouldPostWeeklyAnnouncement(state1));

const state2 = {
  concerts: [],
  lastAnnouncementDate: new Date('2026-03-01')
};
console.log('Old announcement:', shouldPostWeeklyAnnouncement(state2));

// Test getConcertsToCancelNow
console.log('\nTesting getConcertsToCancelNow...');
const concerts = [
  {
    id: '1',
    venue: { name: 'Test', city: 'Test' },
    date: new Date(Date.now() + 86400000),
    announcementDate: new Date(),
    cancellationDate: new Date(Date.now() - 3600000), // 1 hour ago
    isPinned: false,
    isCanceled: false,
  },
  {
    id: '2',
    venue: { name: 'Test2', city: 'Test2' },
    date: new Date(Date.now() + 86400000 * 2),
    announcementDate: new Date(),
    cancellationDate: new Date(Date.now() + 3600000), // 1 hour from now
    isPinned: false,
    isCanceled: false,
  }
];
const toCancel = getConcertsToCancelNow(concerts);
console.log('Concerts to cancel:', toCancel.length, '(expected 1)');

// Test hasRemainingConcertsInWeek
console.log('\nTesting hasRemainingConcertsInWeek...');
const hasRemaining = hasRemainingConcertsInWeek(concerts[0], concerts);
console.log('Has remaining:', hasRemaining, '(expected true)');
```

Run test:
Run: `node test-scheduler.mjs`
Expected: Tests pass with expected output

Clean up:
Run: `rm test-scheduler.mjs`

- [ ] **Step 4: Commit scheduler module**

```bash
git add src/scheduler.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add scheduling logic

Determine when to post announcements and cancel concerts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Main Orchestrator

### Task 8: Implement Main Loop

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create index.ts with main orchestration logic**

```typescript
import 'dotenv/config';
import { BlueskyClient } from './blueskyClient.js';
import { loadState, saveState } from './storage.js';
import { generateWeeklyConcerts } from './concertGenerator.js';
import {
  shouldPostWeeklyAnnouncement,
  getConcertsToCancelNow,
  hasRemainingConcertsInWeek,
} from './scheduler.js';
import type { State } from './types.js';

// Configuration
const CHECK_INTERVAL_MS = 42 * 60 * 1000; // 42 minutes in milliseconds

// Environment variables
const BLUESKY_IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
  console.error('[Main] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set in .env');
  process.exit(1);
}

// Global state
let state: State;
let client: BlueskyClient;

/**
 * Initialize the bot
 */
async function initialize(): Promise<void> {
  console.log('[Main] Starting Morriliebers Bluesky Bot...');

  // Load state
  state = await loadState();
  console.log(`[Main] Loaded state with ${state.concerts.length} concerts`);

  // Initialize Bluesky client
  client = new BlueskyClient(BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD);
  await client.authenticate();

  console.log('[Main] Bot initialized successfully');
}

/**
 * Handle weekly announcement posting
 */
async function handleWeeklyAnnouncement(): Promise<void> {
  if (!shouldPostWeeklyAnnouncement(state)) {
    return;
  }

  console.log('[Main] Time to post weekly announcement!');

  try {
    // Generate concerts for the week
    const concerts = generateWeeklyConcerts();

    // Post announcement
    const postUri = await client.postWeeklyAnnouncement(concerts);

    // Pin the announcement
    await client.pinPost(postUri);

    // Update state
    concerts.forEach(concert => {
      concert.postId = postUri;
      concert.isPinned = true;
    });

    state.concerts.push(...concerts);
    state.lastAnnouncementDate = new Date();
    state.weeklyPostId = postUri;

    await saveState(state);

    console.log(`[Main] Posted and pinned ${concerts.length} concerts`);
  } catch (error) {
    console.error('[Main] Error handling weekly announcement:', error);
  }
}

/**
 * Handle concert cancellations
 */
async function handleCancellations(): Promise<void> {
  const concertsToCancel = getConcertsToCancelNow(state.concerts);

  if (concertsToCancel.length === 0) {
    return;
  }

  console.log(`[Main] Found ${concertsToCancel.length} concerts to cancel`);

  for (const concert of concertsToCancel) {
    try {
      // Post cancellation
      const cancelPostUri = await client.postCancellation(concert);

      // Update concert state
      concert.isCanceled = true;
      concert.cancelPostId = cancelPostUri;

      // Check if we should unpin the weekly announcement
      if (!hasRemainingConcertsInWeek(concert, state.concerts)) {
        console.log('[Main] No remaining concerts this week, unpinning announcement');
        await client.unpinPost();

        // Update all concerts in this week to reflect unpinned status
        const weekStart = getWeekStart(concert.date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        state.concerts.forEach(c => {
          if (c.date >= weekStart && c.date < weekEnd) {
            c.isPinned = false;
          }
        });
      }

      await saveState(state);

      console.log(`[Main] Canceled concert: ${concert.venue.name}, ${concert.venue.city}`);
    } catch (error) {
      console.error(`[Main] Error canceling concert ${concert.id}:`, error);
    }
  }
}

/**
 * Main loop iteration
 */
async function mainLoop(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n[Main] Loop iteration at ${timestamp}`);

  try {
    // Handle weekly announcement
    await handleWeeklyAnnouncement();

    // Handle cancellations
    await handleCancellations();
  } catch (error) {
    console.error('[Main] Error in main loop:', error);
  }

  console.log('[Main] Loop iteration complete');
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
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  console.log('\n[Main] Shutting down gracefully...');

  try {
    await saveState(state);
    console.log('[Main] State saved');
  } catch (error) {
    console.error('[Main] Error saving state during shutdown:', error);
  }

  console.log('[Main] Bot stopped');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
(async () => {
  try {
    await initialize();

    // Run immediately on startup
    await mainLoop();

    // Then run on interval
    setInterval(mainLoop, CHECK_INTERVAL_MS);

    console.log(`[Main] Bot running, checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  }
})();
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Compile TypeScript**

Run: `npx tsc`
Expected: Creates dist/ directory with compiled JavaScript

- [ ] **Step 4: Commit main orchestrator**

```bash
git add src/index.ts
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "feat: add main orchestrator

42-minute loop handling announcements and cancellations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 7: Configuration & Documentation

### Task 9: Create Configuration Files

**Files:**
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create .env.example**

```
# Bluesky Credentials
BLUESKY_IDENTIFIER=your-username.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

- [ ] **Step 2: Create README.md**

```markdown
# Morriliebers Bluesky Bot

Automated Bluesky bot for Morriliebers (Morrissey tribute band) that announces weekly concerts and then cancels them 20-24 hours before showtime.

## Features

- 📅 Generates 1-3 concerts per week for Spanish venues
- 📢 Posts weekly announcement every Monday (10:00-14:00)
- 📌 Pins announcements to profile
- ❌ Cancels concerts 20-24 hours before showtime
- 🇪🇸 All messages in Spanish

## Prerequisites

- Node.js 18+
- Bluesky account with app password

## Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd morriliebers-bot
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Bluesky credentials
   ```

3. **Get Bluesky app password:**
   - Go to Settings > App Passwords in Bluesky
   - Create a new app password
   - Add it to `.env`

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Production Deployment

Using pm2 for process management:

```bash
# Install pm2 globally
npm install -g pm2

# Build the project
npm run build

# Start with pm2
pm2 start dist/index.js --name morriliebers-bot

# Save pm2 configuration
pm2 save

# Configure pm2 to start on boot
pm2 startup
```

## How It Works

1. **Every 42 minutes**, the bot checks:
   - Is it Monday 10:00-14:00? → Generate and post weekly concerts
   - Are any concerts 20-24 hours away? → Post cancellation

2. **Weekly announcements** (Monday):
   - Generates 1-3 concerts for Wed-Sun
   - Times: 17:00-23:30 (30-minute intervals)
   - Posts single announcement with all concerts
   - Pins the announcement

3. **Cancellations** (20-24h before concert):
   - Posts: "Morriliebers lamenta anunciar la cancelación de su concierto en {venue} del día {dd/mm}"
   - Unpins announcement if no concerts remain for the week

## Venues

13 venues across Spanish cities (500k+ population):
- Madrid: 6 venues
- Barcelona: 3 venues
- Valencia: 2 venues
- Sevilla: 1 venue
- Zaragoza: 1 venue

Edit `config/venues.json` to modify the venue list.

## Project Structure

```
morriliebers-bot/
├── src/
│   ├── index.ts              # Main orchestrator
│   ├── types.ts              # TypeScript interfaces
│   ├── venues.ts             # Venue data & selection
│   ├── storage.ts            # State persistence
│   ├── concertGenerator.ts   # Concert generation
│   ├── blueskyClient.ts      # Bluesky API wrapper
│   └── scheduler.ts          # Scheduling logic
├── config/
│   └── venues.json           # Venue list
├── data/
│   └── concerts.json         # State file (created at runtime)
└── dist/                     # Compiled JavaScript
```

## Monitoring

```bash
# View logs
pm2 logs morriliebers-bot

# Check status
pm2 status

# Restart bot
pm2 restart morriliebers-bot
```

## License

MIT
```

- [ ] **Step 3: Commit configuration files**

```bash
git add .env.example README.md
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "docs: add configuration and README

Environment template and deployment instructions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 10: Final Setup & Testing

**Files:**
- Verify all files are in place

- [ ] **Step 1: Verify project structure**

Run: `ls -R`
Expected: All directories and files present

- [ ] **Step 2: Clean build**

Run: `rm -rf dist node_modules && npm install && npx tsc`
Expected: Clean install and successful compilation

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Create .env file for testing (manual)**

Note: User must create `.env` with their Bluesky credentials before running

- [ ] **Step 5: Test bot startup (requires .env)**

Run: `npm run dev`
Expected: Bot starts, authenticates, loads state, begins checking loop
Manual: Stop with Ctrl+C after verifying startup

- [ ] **Step 6: Verify graceful shutdown**

Run: `npm run dev` then press Ctrl+C
Expected: Saves state and exits cleanly

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit --author="Ramon Ferrer <ramonacus@gmail.com>" -m "chore: finalize project setup

All modules implemented and tested

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Implementation Complete

The bot is now ready for deployment. To run:

1. Create `.env` with Bluesky credentials
2. Run `npm install && npm run build`
3. Start with `npm start` or use pm2 for production

The bot will:
- Check every 42 minutes
- Post weekly announcements on Mondays (10:00-14:00)
- Cancel concerts 20-24 hours before showtime
- Maintain state across restarts in `data/concerts.json`
