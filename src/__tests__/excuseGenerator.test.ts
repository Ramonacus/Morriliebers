import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateExcuse } from '../excuseGenerator.js';
import { createMockConcert } from './fixtures.js';
import type { Concert } from '../types.js';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock the @ai-sdk/google module
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model: string) => ({ model })),
}));

describe('ExcuseGenerator', () => {
  let mockConcert: Concert;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConcert = createMockConcert({
      venue: { name: 'Sala But', city: 'Madrid' },
      date: new Date('2026-03-20T20:00:00'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Tests will go here
});
