// Mock modules before imports
vi.mock('../scripts/utils.js');
vi.mock('../tourGenerator.js');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeClient, loadAndValidateState, saveAndExit } from '../scripts/utils.js';
import { generateTour } from '../tourGenerator.js';
import { announceScript } from '../scripts/announce.js';
import { createMockTour, createMockState, createMockConcert } from './fixtures.js';
import type { BlueskyClient } from '../blueskyClient.js';

describe('announce script', () => {
  let mockClient: BlueskyClient;
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock client with postTourAnnouncement method
    mockClient = {
      postTourAnnouncement: vi.fn().mockResolvedValue({
        overviewPostId: 'at://post/overview',
        weeklyPostIds: ['at://post/week1', 'at://post/week2']
      })
    } as any;

    vi.mocked(initializeClient).mockResolvedValue(mockClient);
  });

  it('successfully generates and announces tour', async () => {
    const existingState = createMockState({
      tours: []
    });
    const newTour = createMockTour();

    vi.mocked(loadAndValidateState).mockResolvedValue(existingState);
    vi.mocked(generateTour).mockReturnValue(newTour);
    vi.mocked(saveAndExit).mockResolvedValue(undefined as never);

    // Run the script
    await announceScript();

    // Verify tour was generated
    expect(generateTour).toHaveBeenCalled();

    // Verify tour was posted to Bluesky
    expect(mockClient.postTourAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        id: newTour.id,
        continent: newTour.continent
      })
    );

    // Verify state was saved with new tour and lastTourGenerationDate
    expect(saveAndExit).toHaveBeenCalledWith(
      expect.objectContaining({
        tours: expect.arrayContaining([
          expect.objectContaining({
            id: newTour.id,
            overviewPostId: 'at://post/overview',
            weeklyPostIds: ['at://post/week1', 'at://post/week2']
          })
        ]),
        lastTourGenerationDate: expect.any(Date)
      }),
      0 // Exit code 0 for success
    );
  });

  it('handles Bluesky posting errors', async () => {
    const existingState = createMockState({ tours: [] });
    const newTour = createMockTour();

    vi.mocked(loadAndValidateState).mockResolvedValue(existingState);
    vi.mocked(generateTour).mockReturnValue(newTour);
    mockClient.postTourAnnouncement = vi.fn().mockRejectedValue(new Error('Bluesky API error'));

    // Run the script - expect it to throw
    await expect(announceScript()).rejects.toThrow('Bluesky API error');

    // Verify saveAndExit was never called (don't save on posting failure)
    expect(saveAndExit).not.toHaveBeenCalled();
  });

  it('logs appropriate messages during execution', async () => {
    const existingState = createMockState({ tours: [] });
    const newTour = createMockTour({
      concerts: [createMockConcert(), createMockConcert(), createMockConcert()]
    });

    vi.mocked(loadAndValidateState).mockResolvedValue(existingState);
    vi.mocked(generateTour).mockReturnValue(newTour);
    vi.mocked(saveAndExit).mockResolvedValue(undefined as never);

    await announceScript();

    // Verify logging messages
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Generating new tour')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Tour generated:')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Posting tour announcement')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Scripts] Tour announcement posted successfully')
    );
  });
});
