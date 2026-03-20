import 'dotenv/config';

/**
 * TODO: Update for tour-based system
 * This script needs to be updated to work with tours and the new concert structure
 * (no pinning, concerts nested in tours).
 *
 * @deprecated Temporarily disabled during migration to tour system
 */
export async function runCancelNext(): Promise<void> {
  console.error('[Cancel] This script is temporarily disabled during migration to tour system');
  console.error('[Cancel] Please use the main bot (npm start) which uses the new tour-based cancellation');
  process.exit(1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCancelNext();
}
