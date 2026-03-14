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
});
