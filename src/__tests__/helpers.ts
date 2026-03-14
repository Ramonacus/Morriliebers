import { vi } from 'vitest';

/**
 * Set up fake timers and set the current time
 */
export function setMockTime(date: Date): void {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

/**
 * Reset timers to real implementation
 */
export function resetMockTime(): void {
  vi.useRealTimers();
}

/**
 * Mock Math.random with a sequence of values
 */
export function mockRandomSequence(values: number[]): void {
  let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

/**
 * Create a mock Bluesky agent for testing
 */
export function createMockBskyAgent() {
  return {
    login: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ uri: 'at://post/123' }),
    upsertProfile: vi.fn((callback) => {
      const existing = { displayName: 'Test', description: 'Bio' };
      const updated = callback(existing);
      return Promise.resolve(updated);
    })
  };
}

/**
 * Set up file system mocks for testing storage
 * Use with vi.mocked() after importing fs modules
 */
export function setupFileSystemMocks(options: {
  fileExists?: boolean;
  fileContent?: string;
  readError?: Error;
  writeError?: Error;
  renameError?: Error;
} = {}) {
  const {
    fileExists = false,
    fileContent = '{}',
    readError,
    writeError,
    renameError
  } = options;

  return {
    existsSync: vi.fn(() => fileExists),
    readFile: vi.fn(() =>
      readError ? Promise.reject(readError) : Promise.resolve(fileContent)
    ),
    writeFile: vi.fn(() =>
      writeError ? Promise.reject(writeError) : Promise.resolve()
    ),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn(() =>
      renameError ? Promise.reject(renameError) : Promise.resolve()
    )
  };
}
