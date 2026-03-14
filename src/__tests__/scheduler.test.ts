import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldPostWeeklyAnnouncement } from '../scheduler.js';
import { createMockState } from './fixtures.js';
import { setMockTime, resetMockTime } from './helpers.js';

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
