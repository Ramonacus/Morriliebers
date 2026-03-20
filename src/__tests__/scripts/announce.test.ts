// Mock modules at top level
vi.mock('../../scripts/utils.js');
vi.mock('../../concertGenerator.js');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { BlueskyClient } from '../../blueskyClient.js';
import { initializeClient, loadAndValidateState, saveAndExit } from '../../scripts/utils.js';
import { generateWeeklyConcerts } from '../../concertGenerator.js';
import { runAnnounce } from '../../scripts/announce.js';
import { createMockState, createMockConcert } from '../fixtures.js';

// Legacy tests for old weekly concert system (replaced by tour system)
describe.skip('Announce Script', () => {
  let mockClient: Pick<BlueskyClient, 'postWeeklyAnnouncement' | 'pinPost'>;
  let consoleLogSpy: MockInstance<typeof console.log>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock client
    mockClient = {
      postWeeklyAnnouncement: vi.fn().mockResolvedValue('at://post/123'),
      pinPost: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(initializeClient).mockResolvedValue(mockClient);
  });

  it('generates concerts, posts announcement, pins post, and updates state', async () => {
    const mockState = createMockState({ concerts: [] });
    const newConcerts = [
      createMockConcert({ id: 'concert-1' }),
      createMockConcert({ id: 'concert-2' })
    ];

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(generateWeeklyConcerts).mockReturnValue(newConcerts);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runAnnounce();
    }).rejects.toThrow('process.exit(0)');

    // Verify workflow
    expect(initializeClient).toHaveBeenCalled();
    expect(loadAndValidateState).toHaveBeenCalled();
    expect(generateWeeklyConcerts).toHaveBeenCalled();
    expect(mockClient.postWeeklyAnnouncement).toHaveBeenCalledWith(newConcerts);
    expect(mockClient.pinPost).toHaveBeenCalledWith('at://post/123');

    // Verify state update
    const savedState = vi.mocked(saveAndExit).mock.calls[0][0];
    expect(savedState.concerts).toHaveLength(2);
    expect(savedState.concerts[0].postId).toBe('at://post/123');
    expect(savedState.concerts[0].isPinned).toBe(true);
    expect(savedState.concerts[1].postId).toBe('at://post/123');
    expect(savedState.concerts[1].isPinned).toBe(true);
    expect(savedState.weeklyPostId).toBe('at://post/123');
    expect(savedState.lastAnnouncementDate).toBeInstanceOf(Date);

    // Verify exit code
    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(0);

    // Verify logging
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Generated 2 concerts')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Posted and pinned announcement')
    );
  });

  it('adds new concerts to existing state', async () => {
    const existingConcert = createMockConcert({ id: 'existing' });
    const mockState = createMockState({ concerts: [existingConcert] });
    const newConcerts = [createMockConcert({ id: 'new' })];

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(generateWeeklyConcerts).mockReturnValue(newConcerts);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runAnnounce();
    }).rejects.toThrow('process.exit(0)');

    const savedState = vi.mocked(saveAndExit).mock.calls[0][0];
    expect(savedState.concerts).toHaveLength(2);
    expect(savedState.concerts[0]).toBe(existingConcert);
    expect(savedState.concerts[1].id).toBe('new');
  });

  it('handles post failure gracefully', async () => {
    const mockState = createMockState();
    const newConcerts = [createMockConcert()];

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(generateWeeklyConcerts).mockReturnValue(newConcerts);
    mockClient.postWeeklyAnnouncement.mockRejectedValue(new Error('Post failed'));
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    await expect(async () => {
      await runAnnounce();
    }).rejects.toThrow('process.exit(1)');

    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(1);
  });

  it('handles pin failure gracefully', async () => {
    const mockState = createMockState();
    const newConcerts = [createMockConcert()];

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(generateWeeklyConcerts).mockReturnValue(newConcerts);
    mockClient.pinPost.mockRejectedValue(new Error('Pin failed'));
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    await expect(async () => {
      await runAnnounce();
    }).rejects.toThrow('process.exit(1)');

    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(1);
  });
});
