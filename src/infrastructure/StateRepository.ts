import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { BotState } from '../domain/BotState.js';

export class StateRepository {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load state from JSON file, create empty if doesn't exist
   */
  async load(): Promise<BotState> {
    try {
      const dataDir = dirname(this.filePath);

      // Create data directory if it doesn't exist
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }

      // Return empty state if file doesn't exist
      if (!existsSync(this.filePath)) {
        console.log('[StateRepository] No state file found, creating new state');
        return new BotState();
      }

      // Read and parse state file
      const data = await readFile(this.filePath, 'utf-8');
      const json = JSON.parse(data);
      return BotState.fromJSON(json);
    } catch (error) {
      console.error('[StateRepository] Error loading state:', error);

      // Backup corrupted file
      if (existsSync(this.filePath)) {
        const backupPath = `${this.filePath}.backup-${Date.now()}`;
        console.log(`[StateRepository] Backing up corrupted state to ${backupPath}`);
        try {
          const corruptedData = await readFile(this.filePath, 'utf-8');
          await writeFile(backupPath, corruptedData);
        } catch (backupError) {
          console.error('[StateRepository] Failed to backup corrupted state:', backupError);
        }
      }

      // Return empty state
      console.log('[StateRepository] Returning empty state');
      return new BotState();
    }
  }

  /**
   * Save state to JSON file atomically
   */
  async save(state: BotState): Promise<void> {
    try {
      const dataDir = dirname(this.filePath);

      // Ensure data directory exists
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }

      // Serialize state
      const json = JSON.stringify(state.toJSON(), null, 2);

      // Atomic write: write to temp file, then rename
      const tempFile = `${this.filePath}.tmp`;
      await writeFile(tempFile, json, 'utf-8');
      await rename(tempFile, this.filePath); // Atomic on POSIX systems

      console.log('[StateRepository] State saved successfully');
    } catch (error) {
      console.error('[StateRepository] Error saving state:', error);
      throw error;
    }
  }
}
