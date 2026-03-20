import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { State, SerializedState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const STATE_FILE = join(DATA_DIR, 'concerts.json');

/**
 * Serialize state for JSON storage (convert Dates to ISO strings)
 */
function serializeState(state: State): SerializedState {
  return {
    tours: state.tours.map(tour => ({
      id: tour.id,
      continent: tour.continent,
      startDate: tour.startDate.toISOString(),
      endDate: tour.endDate.toISOString(),
      announcementDate: tour.announcementDate.toISOString(),
      overviewPostId: tour.overviewPostId,
      weeklyPostIds: tour.weeklyPostIds,
      concerts: tour.concerts.map(concert => ({
        id: concert.id,
        venue: concert.venue,
        date: concert.date.toISOString(),
        cancellationDate: concert.cancellationDate.toISOString(),
        weekInTour: concert.weekInTour,
        isCanceled: concert.isCanceled,
        cancelPostId: concert.cancelPostId,
      })),
    })),
    lastTourGenerationDate: state.lastTourGenerationDate?.toISOString(),
  };
}

/**
 * Deserialize state from JSON storage (convert ISO strings to Dates)
 */
function deserializeState(serialized: SerializedState): State {
  return {
    tours: serialized.tours.map(tour => ({
      id: tour.id,
      continent: tour.continent,
      startDate: new Date(tour.startDate),
      endDate: new Date(tour.endDate),
      announcementDate: new Date(tour.announcementDate),
      overviewPostId: tour.overviewPostId,
      weeklyPostIds: tour.weeklyPostIds,
      concerts: tour.concerts.map(concert => ({
        id: concert.id,
        venue: concert.venue,
        date: new Date(concert.date),
        cancellationDate: new Date(concert.cancellationDate),
        weekInTour: concert.weekInTour,
        isCanceled: concert.isCanceled,
        cancelPostId: concert.cancelPostId,
      })),
    })),
    lastTourGenerationDate: serialized.lastTourGenerationDate
      ? new Date(serialized.lastTourGenerationDate)
      : undefined,
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
      const emptyState: State = { tours: [] };
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
    return { tours: [] };
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
    await rename(tempFile, STATE_FILE); // Atomic on POSIX systems

    console.log('[Storage] State saved successfully');
  } catch (error) {
    console.error('[Storage] Error saving state:', error);
    throw error;
  }
}
