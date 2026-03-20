// Mock modules before imports
vi.mock('../scripts/utils.js');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeClient, loadAndValidateState, saveAndExit } from '../scripts/utils.js';
import { createMockTour, createMockState, createMockConcert } from './fixtures.js';
import type { BlueskyClient } from '../blueskyClient.js';

describe('cancel-next script', () => {
  let mockClient: BlueskyClient;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock client with postCancellation method
    mockClient = {
      postCancellation: vi.fn().mockResolvedValue('at://post/cancellation')
    } as any;

    vi.mocked(initializeClient).mockResolvedValue(mockClient);
  });

  it('finds and cancels earliest uncanceled concert by date', async () => {
    const now = Date.now();
    const concert1 = createMockConcert({
      date: new Date(now + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      isCanceled: false
    });
    const concert2 = createMockConcert({
      date: new Date(now + 1 * 24 * 60 * 60 * 1000), // 1 day from now (earliest)
      isCanceled: false
    });
    const concert3 = createMockConcert({
      date: new Date(now + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      isCanceled: false
    });

    const tour = createMockTour({
      concerts: [concert1, concert2, concert3]
    });
    const state = createMockState({ tours: [tour] });

    vi.mocked(loadAndValidateState).mockResolvedValue(state);
    vi.mocked(saveAndExit).mockResolvedValue(undefined as never);

    // Import and run the script
    const { cancelNextScript } = await import('../scripts/cancel-next.js');
    await cancelNextScript();

    // Verify cancellation was posted for the earliest concert
    expect(mockClient.postCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: concert2.id
      })
    );

    // Verify state was updated with cancellation
    expect(saveAndExit).toHaveBeenCalledWith(
      expect.objectContaining({
        tours: expect.arrayContaining([
          expect.objectContaining({
            concerts: expect.arrayContaining([
              expect.objectContaining({
                id: concert2.id,
                isCanceled: true,
                cancelPostId: 'at://post/cancellation'
              })
            ])
          })
        ])
      }),
      0 // Exit code 0 for success
    );
  });

  it('exits with error when no uncanceled concerts exist', async () => {
    const canceledConcert = createMockConcert({
      isCanceled: true
    });
    const tour = createMockTour({
      concerts: [canceledConcert]
    });
    const state = createMockState({ tours: [tour] });

    vi.mocked(loadAndValidateState).mockResolvedValue(state);
    vi.mocked(saveAndExit).mockResolvedValue(undefined as never);

    // Import and run the script
    const { cancelNextScript } = await import('../scripts/cancel-next.js');
    await cancelNextScript();

    // Verify error message was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Error: No uncanceled concerts found')
    );

    // Verify exit with error code 1
    expect(saveAndExit).toHaveBeenCalledWith(
      expect.anything(),
      1 // Exit code 1 for error
    );

    // Verify postCancellation was never called
    expect(mockClient.postCancellation).not.toHaveBeenCalled();
  });

  it('handles Bluesky posting errors', async () => {
    const concert = createMockConcert({ isCanceled: false });
    const tour = createMockTour({ concerts: [concert] });
    const state = createMockState({ tours: [tour] });

    vi.mocked(loadAndValidateState).mockResolvedValue(state);
    mockClient.postCancellation = vi.fn().mockRejectedValue(new Error('Bluesky API error'));

    // Import and run the script - expect it to throw
    const { cancelNextScript } = await import('../scripts/cancel-next.js');
    await expect(cancelNextScript()).rejects.toThrow('Bluesky API error');

    // Verify saveAndExit was never called (don't save on posting failure)
    expect(saveAndExit).not.toHaveBeenCalled();
  });

  it('logs appropriate messages during execution', async () => {
    const concert = createMockConcert({
      isCanceled: false,
      venue: { name: 'Madison Square Garden', city: 'New York', continent: 'North America' }
    });
    const tour = createMockTour({ concerts: [concert] });
    const state = createMockState({ tours: [tour] });

    vi.mocked(loadAndValidateState).mockResolvedValue(state);
    vi.mocked(saveAndExit).mockResolvedValue(undefined as never);

    const { cancelNextScript } = await import('../scripts/cancel-next.js');
    await cancelNextScript();

    // Verify logging messages
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[Scripts\] Found next concert:.*Madison Square Garden.*New York/)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Posting cancellation')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Cancellation posted successfully')
    );
  });
});
