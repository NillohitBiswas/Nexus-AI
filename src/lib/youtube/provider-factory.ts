export interface YouTubeComment {
  youtubeCommentId: string;
  rawText: string;
  authorName: string;
  authorChannelId: string;
  likeCount: number;
  replyCount: number;
  parentId: string | null;
  publishedAt: Date;
}

export class YouTubeProviderFactory {
  /**
   * Decides whether to use standard YouTube API or Apify for ingestion.
   * Logic: isCompetitor OR commentCount > 500 -> Apify; else -> YouTube API
   */
  static getProvider(isCompetitor: boolean, commentCount: number) {
    if (isCompetitor || commentCount > 500) {
      return new ApifyProvider();
    }
    return new StandardYouTubeProvider();
  }
}

export class StandardYouTubeProvider {
  async fetchComments(videoId: string, credentials: { token?: string; apiKey?: string }, limit = 500): Promise<YouTubeComment[]> {
    console.log(`Fetching comments via Standard YouTube API for video: ${videoId}`);
    const comments: YouTubeComment[] = [];
    
    // Check if we have credentials; if not, generate mock comments for debugging
    const hasCredentials = credentials.token || credentials.apiKey;
    if (!hasCredentials || credentials.token?.includes("<PLACEHOLDER") || credentials.apiKey?.includes("<PLACEHOLDER")) {
      console.warn("No valid YouTube credentials found. Generating mock comments for testing.");
      return generateMockComments(videoId, limit);
    }

    try {
      let nextPageToken = "";
      let fetchedCount = 0;

      while (fetchedCount < limit) {
        const maxResults = Math.min(100, limit - fetchedCount);
        let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=${maxResults}`;
        
        if (nextPageToken) {
          url += `&pageToken=${nextPageToken}`;
        }
        
        if (credentials.apiKey) {
          url += `&key=${credentials.apiKey}`;
        }

        const headers: Record<string, string> = {};
        if (credentials.token) {
          headers["Authorization"] = `Bearer ${credentials.token}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "YouTube API error");
        }

        const data = await res.json();
        const items = data.items || [];
        
        for (const item of items) {
          const topComment = item.snippet?.topLevelComment?.snippet;
          if (!topComment) continue;

          const commentId = item.snippet.topLevelComment.id;
          comments.push({
            youtubeCommentId: commentId,
            rawText: topComment.textDisplay || topComment.textOriginal || "",
            authorName: topComment.authorDisplayName || "Anonymous",
            authorChannelId: topComment.authorChannelId?.value || "",
            likeCount: topComment.likeCount || 0,
            replyCount: item.snippet.totalReplyCount || 0,
            parentId: null,
            publishedAt: new Date(topComment.publishedAt),
          });

          // Fetch nested replies if they exist in the response
          const replies = item.replies?.comments || [];
          for (const reply of replies) {
            const replySnippet = reply.snippet;
            if (!replySnippet) continue;
            
            comments.push({
              youtubeCommentId: reply.id,
              rawText: replySnippet.textDisplay || replySnippet.textOriginal || "",
              authorName: replySnippet.authorDisplayName || "Anonymous",
              authorChannelId: replySnippet.authorChannelId?.value || "",
              likeCount: replySnippet.likeCount || 0,
              replyCount: 0,
              parentId: commentId,
              publishedAt: new Date(replySnippet.publishedAt),
            });
          }
        }

        fetchedCount += items.length;
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
      }

      return comments;
    } catch (error) {
      console.error("Error fetching comments from YouTube API:", error);
      // Fail gracefully in non-prod environments by providing mock data
      if (process.env.NODE_ENV !== "production") {
        console.log("Falling back to mock comments due to error.");
        return generateMockComments(videoId, limit);
      }
      throw error;
    }
  }
}

export class ApifyProvider {
  async fetchComments(videoId: string, apiToken: string, limit = 500): Promise<YouTubeComment[]> {
    console.log(`Fetching comments via Apify for video: ${videoId}`);
    
    if (!apiToken || apiToken.includes("<PLACEHOLDER")) {
      console.warn("No valid Apify token found. Generating mock comments for testing.");
      return generateMockComments(videoId, limit);
    }

    try {
      // Trigger Apify YouTube comment scraper actor
      // actor ID: apify/youtube-comment-scraper
      const runUrl = `https://api.apify.com/v2/acts/apify~youtube-comment-scraper/runs?token=${apiToken}`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      const startRes = await fetch(runUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: videoUrl }],
          maxComments: limit,
          maxReplies: 100,
        }),
      });

      if (!startRes.ok) {
        throw new Error("Failed to start Apify actor");
      }

      const runData = await startRes.json();
      const runId = runData.data.id;
      const datasetId = runData.data.defaultDatasetId;

      // Poll for completion (max 5 minutes)
      const maxRetries = 30;
      let isFinished = false;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, 10000)); // wait 10s
        
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
        if (!statusRes.ok) continue;
        
        const statusData = await statusRes.json();
        const status = statusData.data.status;
        
        if (status === "SUCCEEDED") {
          isFinished = true;
          break;
        } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
          throw new Error(`Apify run failed with status: ${status}`);
        }
      }

      if (!isFinished) {
        throw new Error("Apify comment scraping timed out");
      }

      // Fetch dataset items
      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}`);
      if (!itemsRes.ok) {
        throw new Error("Failed to retrieve Apify dataset items");
      }

      const items = await itemsRes.json();
      return items.map((item: any) => ({
        youtubeCommentId: item.id || item.commentId || Math.random().toString(),
        rawText: item.text || item.textDisplay || "",
        authorName: item.authorDisplayName || "Anonymous",
        authorChannelId: item.authorChannelId || "",
        likeCount: item.likes || item.likeCount || 0,
        replyCount: item.repliesCount || 0,
        parentId: item.parentId || null,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching comments from Apify:", error);
      if (process.env.NODE_ENV !== "production") {
        return generateMockComments(videoId, limit);
      }
      throw error;
    }
  }
}

// Mock comments generator for smooth local development / testing
function generateMockComments(videoId: string, limit: number): YouTubeComment[] {
  const categories = [
    "Great product, but there is a annoying bug in the latest version when saving.",
    "Can you guys add a dark mode feature? It is really hard to use at night.",
    "Amazing video! Thank you so much for this detailed breakdown.",
    "This dashboard is slow. I am having a hard time viewing stats.",
    "How does the custom database mapping work with Prisma?",
    "Why does it fail on windows OS? Is there a fix?",
    "Is there any API endpoint we can use directly? Need integrations.",
    "I love the UI and colors. Very premium look!",
    "Another bug: the login page loop when session expires.",
    "Please make a tutorial on how to integrate Brave search."
  ];

  const authors = ["Alex Smith", "Jane Doe", "Dev Guy", "Product Manager", "Tech Enthusiast", "Sarah Connor", "John Wick", "Bruce Wayne"];
  const comments: YouTubeComment[] = [];

  for (let i = 0; i < Math.min(limit, 30); i++) {
    const isReply = i > 0 && Math.random() > 0.6;
    const parentId = isReply ? comments[Math.floor(Math.random() * comments.length)].youtubeCommentId : null;
    
    comments.push({
      youtubeCommentId: `c_${videoId}_${i}`,
      rawText: categories[i % categories.length],
      authorName: authors[i % authors.length],
      authorChannelId: `ch_${authors[i % authors.length].toLowerCase().replace(" ", "_")}`,
      likeCount: Math.floor(Math.random() * 50),
      replyCount: isReply ? 0 : Math.floor(Math.random() * 3),
      parentId,
      publishedAt: new Date(Date.now() - i * 3600000), // successive hours ago
    });
  }

  return comments;
}
