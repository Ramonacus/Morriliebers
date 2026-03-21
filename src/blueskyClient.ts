import { BskyAgent } from "@atproto/api";
import type { Concert, Tour } from "./types.js";
import { generateExcuse } from "./excuseGenerator.js";

export class BlueskyClient {
  private agent: BskyAgent;
  private identifier: string;
  private password: string;

  constructor(identifier: string, password: string) {
    this.agent = new BskyAgent({ service: "https://bsky.social" });
    this.identifier = identifier;
    this.password = password;
  }

  /**
   * Authenticate with Bluesky
   */
  async authenticate(): Promise<void> {
    try {
      console.log("[Bluesky] Authenticating...");
      await this.agent.login({
        identifier: this.identifier,
        password: this.password,
      });
      console.log("[Bluesky] Authentication successful");
    } catch (error) {
      console.error("[Bluesky] Authentication failed:");
      console.error(error);
      throw new Error("Failed to authenticate with Bluesky");
    }
  }

  /**
   * Format concert for announcement
   */
  private formatConcertLine(concert: Concert): string {
    const dayName = concert.date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dateStr = concert.date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
    });
    const timeStr = concert.date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
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
      console.log("[Bluesky] Posting weekly announcement...");

      const concertLines = concerts
        .map((c) => this.formatConcertLine(c))
        .join("\n");
      const text = `Upcoming Morriliebers concerts:\n\n${concertLines}`;

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log("[Bluesky] Weekly announcement posted:", response.uri);
      return response.uri;
    } catch (error) {
      console.error("[Bluesky] Failed to post announcement:", error);
      throw error;
    }
  }

  /**
   * Post tour announcement with overview and weekly reply threads
   * @returns Overview post URI and array of weekly post URIs
   */
  async postTourAnnouncement(tour: Tour): Promise<{
    overviewPostId: string;
    weeklyPostIds: string[];
  }> {
    try {
      console.log("[Bluesky] Posting tour announcement...");

      // Format dates
      const startStr = tour.startDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      });
      const endStr = tour.endDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      });

      // Calculate tour duration in weeks
      const weeks = Math.max(...tour.concerts.map((c) => c.weekInTour));

      // Post overview
      const overviewText = `🌍 ¡${tour.continent} Tour Coming up! 🎸

Morriliebers will be touring ${tour.continent} during the next ${weeks} weeks:
📅 ${startStr} - ${endStr}
🎤 ${tour.concerts.length} shows

Details in comments ⬇️`;

      const overviewResponse = await this.agent.post({
        text: overviewText,
        createdAt: new Date().toISOString(),
      });

      console.log("[Bluesky] Tour overview posted:", overviewResponse.uri);

      // Group concerts by week
      const concertsByWeek = new Map<number, Concert[]>();
      for (const concert of tour.concerts) {
        const week = concert.weekInTour;
        if (!concertsByWeek.has(week)) {
          concertsByWeek.set(week, []);
        }
        concertsByWeek.get(week)!.push(concert);
      }

      // Post weekly replies
      const weeklyPostIds: string[] = [];
      for (let week = 1; week <= weeks; week++) {
        const concerts = concertsByWeek.get(week) || [];
        if (concerts.length === 0) continue;

        // Sort concerts by date within week
        concerts.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate week date range
        const weekStart = concerts[0].date;
        const weekEnd = concerts[concerts.length - 1].date;
        const weekStartStr = weekStart.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        });
        const weekEndStr = weekEnd.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        });

        // Format concert lines with flag emojis
        const flagMap: Record<string, string> = {
          "North America": "🇺🇸",
          "South America": "🇧🇷",
          Europe: "🇪🇺",
          Asia: "🇯🇵",
        };
        const flag = flagMap[tour.continent] || "🌍";

        const concertLines = concerts
          .map((concert) => {
            const dayName = concert.date.toLocaleDateString("en-GB", {
              weekday: "long",
            });
            const dayCapitalized =
              dayName.charAt(0).toUpperCase() + dayName.slice(1);
            const dateStr = concert.date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
            });
            const timeStr = concert.date.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            return `${flag} ${dayCapitalized} ${dateStr} - ${timeStr} - ${concert.venue.name}, ${concert.venue.city}`;
          })
          .join("\n");

        const weekText = `📍 Week ${week} (${weekStartStr} - ${weekEndStr})

${concertLines}`;

        // Post as reply to overview
        const weekResponse = await this.agent.post({
          text: weekText,
          createdAt: new Date().toISOString(),
          reply: {
            root: { uri: overviewResponse.uri, cid: overviewResponse.cid },
            parent: { uri: overviewResponse.uri, cid: overviewResponse.cid },
          },
        });

        weeklyPostIds.push(weekResponse.uri);
        console.log(`[Bluesky] Week ${week} post created:`, weekResponse.uri);
      }

      console.log("[Bluesky] Tour announcement complete");

      return {
        overviewPostId: overviewResponse.uri,
        weeklyPostIds,
      };
    } catch (error) {
      console.error("[Bluesky] Failed to post tour announcement:", error);
      throw error;
    }
  }

  /**
   * Post cancellation announcement
   * @returns Post URI
   */
  async postCancellation(concert: Concert): Promise<string> {
    try {
      console.log("[Bluesky] Posting cancellation...");

      const text = await generateExcuse(concert);

      const response = await this.agent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      console.log("[Bluesky] Cancellation posted:", response.uri);
      return response.uri;
    } catch (error) {
      console.error("[Bluesky] Failed to post cancellation:", error);
      throw error;
    }
  }
}
