import 'dotenv/config';

/**
 * TODO: Update for tour-based system
 * This script needs to be updated to use generateTour() and postTourAnnouncement()
 * instead of the old weekly concert system.
 *
 * @deprecated Temporarily disabled during migration to tour system
 */
export async function runAnnounce(): Promise<void> {
  console.error('[Announce] This script is temporarily disabled during migration to tour system');
  console.error('[Announce] Please use the main bot (npm start) which uses the new tour generation');
  process.exit(1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnnounce();
}
