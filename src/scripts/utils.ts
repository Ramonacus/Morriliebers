import { BlueskyClient } from '../blueskyClient.js';
import { loadState, saveState } from '../storage.js';
import type { State } from '../types.js';

/**
 * Initialize and authenticate Bluesky client
 */
export async function initializeClient(): Promise<BlueskyClient> {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!identifier || !password) {
    console.error('[Scripts] Error: BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set');
    process.exit(1);
  }

  try {
    const client = new BlueskyClient(identifier, password);
    await client.authenticate();
    return client;
  } catch (error) {
    console.error('[Scripts] Failed to authenticate');
    process.exit(1);
  }
}

/**
 * Load and validate state file
 */
export async function loadAndValidateState(): Promise<State> {
  try {
    const state = await loadState();
    console.log(`[Scripts] Loaded state with ${state.concerts.length} concerts`);
    return state;
  } catch (error) {
    console.error('[Scripts] Failed to load state');
    process.exit(1);
  }
}

/**
 * Save state and exit with status code
 */
export async function saveAndExit(state: State, exitCode: number): Promise<never> {
  try {
    await saveState(state);
    console.log('[Scripts] State saved successfully');
  } catch (error) {
    console.error('[Scripts] Failed to save state');
    process.exit(1);
  }

  process.exit(exitCode);
}
