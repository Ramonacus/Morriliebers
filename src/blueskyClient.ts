import { BskyAgent } from '@atproto/api';
import type { Concert } from './types.js';
import { generateExcuse } from './excuseGenerator.js';

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
   * Format concert for announcement
   */
  private formatConcertLine(concert: Concert): string {
    const dayName = concert.date.toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dateStr = concert.date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    });
    const timeStr = concert.date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `• ${dayCapitalized} ${dateStr} at ${timeStr} - ${concert.venue.name}, ${concert.venue.city}`;
  }

  /**
   * Post weekly announcement with all concerts
   * @returns Post URI
   */
  async postWeeklyAnnouncement(concerts: Concert[]): Promise<string> {
    try {
      console.log('[Bluesky] Posting weekly announcement...');

      const concertLines = concerts
        .map((c) => this.formatConcertLine(c))
        .join('\n');
      const text = `Upcoming Morriliebers concerts:\n\n${concertLines}`;

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log('[Bluesky] Weekly announcement posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post announcement:', error);
      throw error;
    }
  }

  /**
   * Post cancellation announcement
   * @returns Post URI
   */
  async postCancellation(concert: Concert): Promise<string> {
    try {
      console.log('[Bluesky] Posting cancellation...');

      const text = await generateExcuse(concert);

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log('[Bluesky] Cancellation posted:', response.uri);
      return response.uri;
    } catch (error) {
      console.error('[Bluesky] Failed to post cancellation:', error);
      throw error;
    }
  }

  /**
   * Pin a post to the profile
   */
  async pinPost(postUri: string): Promise<void> {
    try {
      console.log('[Bluesky] Pinning post...');

      // Update profile record to pin the post
      await this.agent.upsertProfile((existing) => ({
        ...existing,
        pinnedPost: postUri,
      }));

      console.log('[Bluesky] Post pinned');
    } catch (error) {
      console.error('[Bluesky] Failed to pin post:', error);
      // Non-fatal error, continue
    }
  }

  /**
   * Unpin the current pinned post
   */
  async unpinPost(): Promise<void> {
    try {
      console.log('[Bluesky] Unpinning post...');

      // Update profile record to remove pinned post
      await this.agent.upsertProfile((existing) => {
        const updated = { ...existing };
        delete updated['pinnedPost'];
        return updated;
      });

      console.log('[Bluesky] Post unpinned');
    } catch (error) {
      console.error('[Bluesky] Failed to unpin post:', error);
      // Non-fatal error, continue
    }
  }
}
