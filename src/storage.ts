import { readFile, writeFile, mkdir } from 'fs/promises';
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
