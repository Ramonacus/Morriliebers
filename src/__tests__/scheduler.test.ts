import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  shouldPostWeeklyAnnouncement,
  shouldGenerateTour,
  getConcertsToCancelNow,
  hasRemainingConcertsInWeek
} from '../scheduler.js';
import { createMockState, createMockConcert, createMockTour } from './fixtures.js';
import { setMockTime, resetMockTime } from './helpers.js';
import { Continent } from '../types.js';

describe('shouldPostWeeklyAnnouncement', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns true on Monday at 12:00 with no previous announcement', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns true on Monday at 10:00 (start of window)', () => {
    setMockTime(new Date('2026-03-09T10:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns true on Monday at 13:59 (end of window)', () => {
    setMockTime(new Date('2026-03-09T13:59:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns false on Monday at 09:59 (before window)', () => {
    setMockTime(new Date('2026-03-09T09:59:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false on Monday at 14:00 (after window)', () => {
    setMockTime(new Date('2026-03-09T14:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false on Tuesday at 12:00', () => {
    // Tuesday, March 10, 2026 at 12:00
    setMockTime(new Date('2026-03-10T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false on Sunday at 12:00', () => {
    // Sunday, March 15, 2026 at 12:00
    setMockTime(new Date('2026-03-15T12:00:00'));

    const state = createMockState();
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns false if already announced this week', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: new Date('2026-03-09T11:00:00') // Earlier today
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(false);
  });

  it('returns true if announced last week', () => {
    // Monday, March 9, 2026 at 12:00
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: new Date('2026-03-02T12:00:00') // Last Monday
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });

  it('returns true with undefined lastAnnouncementDate', () => {
    setMockTime(new Date('2026-03-09T12:00:00'));

    const state = createMockState({
      lastAnnouncementDate: undefined
    });
    const result = shouldPostWeeklyAnnouncement(state);

    expect(result).toBe(true);
  });
});

describe('getConcertsToCancelNow', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns concerts past their cancellation date', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        id: '1',
        cancellationDate: new Date('2026-03-14T22:00:00'), // 1 hour ago
        isCanceled: false
      }),
      createMockConcert({
        id: '2',
        cancellationDate: new Date('2026-03-15T10:00:00'), // Tomorrow
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes already-canceled concerts', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        id: '1',
        cancellationDate: new Date('2026-03-14T22:00:00'),
        isCanceled: true // Already canceled
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no concerts to cancel', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        cancellationDate: new Date('2026-03-15T10:00:00'), // Future
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });

  it('handles concerts without cancellation dates', () => {
    setMockTime(new Date('2026-03-14T23:00:00'));

    const concerts = [
      createMockConcert({
        cancellationDate: undefined,
        isCanceled: false
      })
    ];

    const result = getConcertsToCancelNow(concerts);

    expect(result).toHaveLength(0);
  });
});

describe('hasRemainingConcertsInWeek', () => {
  it('returns true when uncanceled concerts remain in same week', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-12T20:00:00'), // Wednesday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-14T20:00:00'), // Friday, same week
        isCanceled: false
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(true);
  });

  it('returns false when all concerts in week are canceled', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-12T20:00:00'), // Wednesday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-14T20:00:00'), // Friday, same week
        isCanceled: true // Also canceled
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(false);
  });

  it('correctly identifies week boundaries', () => {
    const canceledConcert = createMockConcert({
      date: new Date('2026-03-15T20:00:00'), // Sunday
      isCanceled: true
    });

    const allConcerts = [
      canceledConcert,
      createMockConcert({
        id: '2',
        date: new Date('2026-03-16T20:00:00'), // Monday (next week)
        isCanceled: false
      })
    ];

    const result = hasRemainingConcertsInWeek(canceledConcert, allConcerts);

    expect(result).toBe(false);
  });
});

describe('shouldGenerateTour', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns true during morning window (8:00-14:00) with no active concerts', () => {
    // Thursday March 20, 2026 at 10:00
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: undefined
    });

    const result = shouldGenerateTour(state);
    expect(result).toBe(true);
  });

  it('returns true at 8:00 (start of window)', () => {
    setMockTime(new Date('2026-03-20T08:00:00'));
    const state = createMockState({ tours: [] });

    expect(shouldGenerateTour(state)).toBe(true);
  });

  it('returns true at 13:59 (end of window)', () => {
    setMockTime(new Date('2026-03-20T13:59:00'));
    const state = createMockState({ tours: [] });

    expect(shouldGenerateTour(state)).toBe(true);
  });

  it('returns false before 8:00', () => {
    setMockTime(new Date('2026-03-20T07:59:00'));
    const state = createMockState({ tours: [] });

    expect(shouldGenerateTour(state)).toBe(false);
  });

  it('returns false after 14:00', () => {
    setMockTime(new Date('2026-03-20T14:00:00'));
    const state = createMockState({ tours: [] });

    expect(shouldGenerateTour(state)).toBe(false);
  });

  it('returns false if any concert is not canceled', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const tour = createMockTour({
      concerts: [
        createMockConcert({ isCanceled: true }),
        createMockConcert({ isCanceled: false }) // One active
      ]
    });

    const state = createMockState({ tours: [tour] });

    expect(shouldGenerateTour(state)).toBe(false);
  });

  it('returns false if tour already generated today', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: new Date('2026-03-20T09:00:00') // Earlier today
    });

    expect(shouldGenerateTour(state)).toBe(false);
  });

  it('returns true if tour generated yesterday', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: new Date('2026-03-19T10:00:00') // Yesterday
    });

    expect(shouldGenerateTour(state)).toBe(true);
  });
});
