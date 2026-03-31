import { BskyAgent } from '@atproto/api';

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Error thrown when thread creation fails after retries
 */
export class ThreadCreationError extends Error {
  successfulPosts: string[];
  failedAtIndex: number;
  originalError: Error;

  constructor(
    message: string,
    successfulPosts: string[],
    failedAtIndex: number,
    originalError: Error
  ) {
    super(message);
    this.name = 'ThreadCreationError';
    this.successfulPosts = successfulPosts;
    this.failedAtIndex = failedAtIndex;
    this.originalError = originalError;
  }
}

export class BlueskyClient {
  private agent: BskyAgent;
  private identifier: string;
  private password: string;

  constructor(identifier: string, password: string) {
    this.agent = new BskyAgent({ service: 'https://bsky.social' });
    this.identifier = identifier;
    this.password = password;
  }

  /**
   * Authenticate with Bluesky
   */
  async authenticate(): Promise<void> {
    try {
      console.log('[Bluesky] Authenticating...');
      await this.agent.login({
        identifier: this.identifier,
        password: this.password,
      });
      console.log('[Bluesky] Authentication successful');
    } catch (error) {
      console.error('[Bluesky] Authentication failed:');
      console.error(error);
      throw new Error('Failed to authenticate with Bluesky');
    }
  }

  /**
   * Post a single message to Bluesky
   * @param text - The text content to post
   * @param reply - Optional reply metadata (root and parent)
   * @returns Post URI
   */
  async post(text: string, reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  }): Promise<string> {
    try {
      const postData: any = { text, createdAt: new Date().toISOString() };

      if (reply) {
        postData.reply = reply;
      }

      const response = await this.agent.post(postData);
      console.log('[Bluesky] Posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post:', error);
      throw error;
    }
  }

  /**
   * Create a thread by posting texts in sequence
   * @returns Array of post URIs
   */
  async createThread(posts: string[]): Promise<string[]> {
    const uris: string[] = [];
    let rootUri: string | undefined;
    let rootCid: string | undefined;
    let parentUri: string | undefined;
    let parentCid: string | undefined;

    for (let i = 0; i < posts.length; i++) {
      const postData: any = { text: posts[i] };

      if (i > 0) {
        postData.reply = {
          root: { uri: rootUri, cid: rootCid },
          parent: { uri: parentUri, cid: parentCid },
        };
      }

      let response;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          response = await this.agent.post(postData);
          break;
        } catch (error) {
          if (attempt === 4) {
            throw new ThreadCreationError(
              `Failed to post thread item ${i} after 5 attempts`,
              uris,
              i,
              error as Error
            );
          }
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Defensive check - should never happen due to retry logic above
      if (!response) {
        throw new ThreadCreationError(
          `Failed to post thread item ${i}: no response received`,
          uris,
          i,
          new Error('No response from post attempt')
        );
      }

      uris.push(response.uri);

      if (i === 0) {
        rootUri = response.uri;
        rootCid = response.cid;
      }

      parentUri = response.uri;
      parentCid = response.cid;
    }

    return uris;
  }
}
