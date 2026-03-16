// Mock modules at top level
vi.mock('../../scripts/utils.js');
vi.mock('../../scheduler.js');

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeClient, loadAndValidateState, saveAndExit } from '../../scripts/utils.js';
import { hasRemainingConcertsInWeek } from '../../scheduler.js';
import { runCancelNext } from '../../scripts/cancel-next.js';
import { createMockState, createMockConcert } from '../fixtures.js';

describe('Cancel Next Script', () => {
  let mockClient: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock client
    mockClient = {
      postCancellation: vi.fn().mockResolvedValue('at://cancel/123'),
      unpinPost: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(initializeClient).mockResolvedValue(mockClient);
  });

  it('exits gracefully when no concerts exist', async () => {
    const mockState = createMockState({ concerts: [] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(0)');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No upcoming concerts to cancel')
    );
    expect(mockClient.postCancellation).not.toHaveBeenCalled();
    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(0);
  });

  it('exits gracefully when all concerts are already canceled', async () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days from now
    const concert = createMockConcert({
      isCanceled: true,
      date: futureDate
    });
    const mockState = createMockState({ concerts: [concert] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(0)');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No upcoming concerts to cancel')
    );
    expect(mockClient.postCancellation).not.toHaveBeenCalled();
  });

  it('cancels the next chronologically upcoming concert', async () => {
    const concert1 = createMockConcert({
      id: 'concert-1',
      date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
      isCanceled: false
    });
    const concert2 = createMockConcert({
      id: 'concert-2',
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now (earliest)
      isCanceled: false
    });
    const concert3 = createMockConcert({
      id: 'concert-3',
      date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      isCanceled: false
    });
    const mockState = createMockState({ concerts: [concert1, concert2, concert3] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(hasRemainingConcertsInWeek).mockReturnValue(true);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(0)');

    // Should cancel concert2 (earliest date)
    expect(mockClient.postCancellation).toHaveBeenCalledWith(concert2);
    expect(mockClient.unpinPost).not.toHaveBeenCalled();

    const savedState = vi.mocked(saveAndExit).mock.calls[0][0];
    expect(savedState.concerts[1].isCanceled).toBe(true);
    expect(savedState.concerts[1].cancelPostId).toBe('at://cancel/123');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Canceled concert')
    );
  });

  it('unpins announcement when no concerts remain in the week', async () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days from now
    const concert = createMockConcert({
      date: futureDate,
      isCanceled: false,
      isPinned: true
    });
    const mockState = createMockState({ concerts: [concert] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(hasRemainingConcertsInWeek).mockReturnValue(false);
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(0)');

    expect(mockClient.postCancellation).toHaveBeenCalledWith(concert);
    expect(mockClient.unpinPost).toHaveBeenCalled();

    const savedState = vi.mocked(saveAndExit).mock.calls[0][0];
    expect(savedState.concerts[0].isPinned).toBe(false);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No remaining concerts this week, unpinning')
    );
  });

  it('handles cancellation post failure', async () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days from now
    const concert = createMockConcert({
      isCanceled: false,
      date: futureDate
    });
    const mockState = createMockState({ concerts: [concert] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    mockClient.postCancellation.mockRejectedValue(new Error('Post failed'));
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(1)');

    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(1);
  });

  it('handles unpin failure gracefully', async () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days from now
    const concert = createMockConcert({
      isCanceled: false,
      date: futureDate
    });
    const mockState = createMockState({ concerts: [concert] });

    vi.mocked(loadAndValidateState).mockResolvedValue(mockState);
    vi.mocked(hasRemainingConcertsInWeek).mockReturnValue(false);
    mockClient.unpinPost.mockRejectedValue(new Error('Unpin failed'));
    vi.mocked(saveAndExit).mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    await expect(async () => {
      await runCancelNext();
    }).rejects.toThrow('process.exit(1)');

    expect(vi.mocked(saveAndExit).mock.calls[0][1]).toBe(1);
  });
});
