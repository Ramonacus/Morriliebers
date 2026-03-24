import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAndAnnounceTour, cancelConcert } from '../actions.js';
import type { BlueskyClient } from '../blueskyClient.js';
import type { State, Concert } from '../types.js';
import { Continent } from '../types.js';

// Mock dependencies
vi.mock('../tourGenerator.js', () => ({
  generateTour: vi.fn()
}));

vi.mock('../storage.js', () => ({
  saveState: vi.fn()
}));

import { generateTour } from '../tourGenerator.js';
import { saveState } from '../storage.js';

describe('generateAndAnnounceTour', () => {
  let mockClient: BlueskyClient;
  let state: State;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock BlueskyClient
    mockClient = {
      postTourAnnouncement: vi.fn()
    } as any;

    // Initial state
    state = {
      tours: [],
      lastTourGenerationDate: undefined
    };
  });

  it('generates tour, posts announcement, updates state, and saves', async () => {
    // Setup
    const mockTour = {
      id: 'tour-1',
      continent: Continent.Europe,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-15'),
      announcementDate: new Date('2026-03-24'),
      weeklyPostIds: [],
      concerts: [
        {
          id: 'concert-1',
          venue: { name: 'Venue 1', city: 'City 1', continent: Continent.Europe },
          date: new Date('2026-04-05'),
          cancellationDate: new Date('2026-04-04'),
          weekInTour: 1,
          isCanceled: false
        }
      ]
    };

    vi.mocked(generateTour).mockReturnValue(mockTour);
    vi.mocked(mockClient.postTourAnnouncement).mockResolvedValue({
      overviewPostId: 'post-123',
      weeklyPostIds: ['week-1']
    });

    // Execute
    await generateAndAnnounceTour(mockClient, state);

    // Verify
    expect(generateTour).toHaveBeenCalledOnce();
    expect(mockClient.postTourAnnouncement).toHaveBeenCalledWith(mockTour);
    expect(mockTour.overviewPostId).toBe('post-123');
    expect(mockTour.weeklyPostIds).toEqual(['week-1']);
    expect(state.tours).toHaveLength(1);
    expect(state.tours[0]).toBe(mockTour);
    expect(state.lastTourGenerationDate).toBeInstanceOf(Date);
    expect(saveState).toHaveBeenCalledWith(state);
  });

  it('throws when postTourAnnouncement fails', async () => {
    const mockTour = {
      id: 'tour-1',
      continent: Continent.Europe,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-15'),
      announcementDate: new Date('2026-03-24'),
      weeklyPostIds: [],
      concerts: []
    };

    vi.mocked(generateTour).mockReturnValue(mockTour);
    vi.mocked(mockClient.postTourAnnouncement).mockRejectedValue(new Error('Bluesky error'));

    await expect(generateAndAnnounceTour(mockClient, state)).rejects.toThrow('Bluesky error');
    expect(saveState).not.toHaveBeenCalled();
  });

  it('throws when saveState fails', async () => {
    const mockTour = {
      id: 'tour-1',
      continent: Continent.Europe,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-15'),
      announcementDate: new Date('2026-03-24'),
      weeklyPostIds: [],
      concerts: []
    };

    vi.mocked(generateTour).mockReturnValue(mockTour);
    vi.mocked(mockClient.postTourAnnouncement).mockResolvedValue({
      overviewPostId: 'post-123',
      weeklyPostIds: []
    });
    vi.mocked(saveState).mockRejectedValue(new Error('Save error'));

    await expect(generateAndAnnounceTour(mockClient, state)).rejects.toThrow('Save error');
  });
});

describe('cancelConcert', () => {
  let mockClient: BlueskyClient;
  let state: State;
  let concert: Concert;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset saveState to resolve by default
    vi.mocked(saveState).mockResolvedValue(undefined);

    mockClient = {
      postCancellation: vi.fn()
    } as any;

    concert = {
      id: 'concert-1',
      venue: { name: 'Venue 1', city: 'City 1', continent: Continent.Europe },
      date: new Date('2026-04-05'),
      cancellationDate: new Date('2026-04-04'),
      weekInTour: 1,
      isCanceled: false
    };

    state = {
      tours: [
        {
          id: 'tour-1',
          continent: Continent.Europe,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-04-15'),
          announcementDate: new Date('2026-03-24'),
          weeklyPostIds: [],
          concerts: [concert]
        }
      ]
    };
  });

  it('posts cancellation, updates concert, and saves state', async () => {
    vi.mocked(mockClient.postCancellation).mockResolvedValue('cancel-post-123');

    await cancelConcert(mockClient, state, concert);

    expect(mockClient.postCancellation).toHaveBeenCalledWith(concert);
    expect(concert.isCanceled).toBe(true);
    expect(concert.cancelPostId).toBe('cancel-post-123');
    expect(saveState).toHaveBeenCalledWith(state);
  });

  it('throws when postCancellation fails', async () => {
    vi.mocked(mockClient.postCancellation).mockRejectedValue(new Error('Bluesky error'));

    await expect(cancelConcert(mockClient, state, concert)).rejects.toThrow('Bluesky error');
    expect(concert.isCanceled).toBe(false);
    expect(concert.cancelPostId).toBeUndefined();
    expect(saveState).not.toHaveBeenCalled();
  });

  it('throws when saveState fails', async () => {
    vi.mocked(mockClient.postCancellation).mockResolvedValue('cancel-post-123');
    vi.mocked(saveState).mockRejectedValue(new Error('Save error'));

    await expect(cancelConcert(mockClient, state, concert)).rejects.toThrow('Save error');
    expect(concert.isCanceled).toBe(true);
    expect(concert.cancelPostId).toBe('cancel-post-123');
  });
});
