import { describe, it, expect, afterEach } from 'vitest';
import {
  shouldGenerateTour,
  getConcertsToCancelNow,
  canGenerateTour,
  getNextConcertToCancel,
} from '../scheduler.js';
import { createMockState, createMockConcert, createMockTour } from './fixtures.js';
import { setMockTime, resetMockTime } from './helpers.js';

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

describe('canGenerateTour', () => {
  afterEach(() => {
    resetMockTime();
  });

  it('returns true when all concerts canceled and no tour today', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const tour = createMockTour({
      concerts: [
        createMockConcert({ isCanceled: true }),
        createMockConcert({ isCanceled: true })
      ]
    });

    const state = createMockState({
      tours: [tour],
      lastTourGenerationDate: undefined
    });

    const result = canGenerateTour(state);
    expect(result).toBe(true);
  });

  it('returns false when any concert is active', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const tour = createMockTour({
      concerts: [
        createMockConcert({ isCanceled: true }),
        createMockConcert({ isCanceled: false }) // Active
      ]
    });

    const state = createMockState({ tours: [tour] });

    expect(canGenerateTour(state)).toBe(false);
  });

  it('returns false when tour already generated today', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: new Date('2026-03-20T09:00:00') // Today
    });

    expect(canGenerateTour(state)).toBe(false);
  });

  it('returns true when tour generated yesterday', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: new Date('2026-03-19T10:00:00') // Yesterday
    });

    expect(canGenerateTour(state)).toBe(true);
  });

  it('returns true when no tours exist', () => {
    setMockTime(new Date('2026-03-20T10:00:00'));

    const state = createMockState({
      tours: [],
      lastTourGenerationDate: undefined
    });

    expect(canGenerateTour(state)).toBe(true);
  });
});

describe('getNextConcertToCancel', () => {
  it('returns concert with earliest cancellation date', () => {
    const tour = createMockTour({
      concerts: [
        createMockConcert({
          id: '1',
          cancellationDate: new Date('2026-03-15T10:00:00'),
          isCanceled: false
        }),
        createMockConcert({
          id: '2',
          cancellationDate: new Date('2026-03-14T22:00:00'), // Earliest
          isCanceled: false
        }),
        createMockConcert({
          id: '3',
          cancellationDate: new Date('2026-03-16T08:00:00'),
          isCanceled: false
        })
      ]
    });

    const result = getNextConcertToCancel([tour]);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('2');
  });

  it('skips already canceled concerts', () => {
    const tour = createMockTour({
      concerts: [
        createMockConcert({
          id: '1',
          cancellationDate: new Date('2026-03-14T10:00:00'), // Earlier but canceled
          isCanceled: true
        }),
        createMockConcert({
          id: '2',
          cancellationDate: new Date('2026-03-15T10:00:00'), // Next valid
          isCanceled: false
        })
      ]
    });

    const result = getNextConcertToCancel([tour]);

    expect(result?.id).toBe('2');
  });

  it('returns null when no concerts exist', () => {
    const result = getNextConcertToCancel([]);
    expect(result).toBeNull();
  });

  it('returns null when all concerts are canceled', () => {
    const tour = createMockTour({
      concerts: [
        createMockConcert({ isCanceled: true }),
        createMockConcert({ isCanceled: true })
      ]
    });

    const result = getNextConcertToCancel([tour]);
    expect(result).toBeNull();
  });

  it('works across multiple tours', () => {
    const tour1 = createMockTour({
      concerts: [
        createMockConcert({
          id: '1',
          cancellationDate: new Date('2026-03-16T10:00:00'),
          isCanceled: false
        })
      ]
    });

    const tour2 = createMockTour({
      concerts: [
        createMockConcert({
          id: '2',
          cancellationDate: new Date('2026-03-15T10:00:00'), // Earliest
          isCanceled: false
        })
      ]
    });

    const result = getNextConcertToCancel([tour1, tour2]);

    expect(result?.id).toBe('2');
  });
});
