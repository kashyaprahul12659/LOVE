import type { PublicComment } from "@/lib/types";

export type CommentSearchOptions = {
  username: string;
  postUrls: string[];
  limit?: number;
  includeReplies?: boolean;
};

export type ProviderSearchResult = {
  comments: PublicComment[];
  scannedPosts: number;
  provider: string;
};

export interface InstagramCommentProvider {
  searchComments(options: CommentSearchOptions): Promise<ProviderSearchResult>;
}

export function normalizeUsername(value: string): string {
  return value.replace(/^@+/, "").trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9._]{1,30}$/i.test(normalizeUsername(value));
}

export function normalizePostUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) {
      return null;
    }

    const match = url.pathname.match(/^\/(?:p|reel|tv)\/([^/?#]+)\/?$/i);
    if (!match?.[1]) return null;

    return `https://www.instagram.com/${url.pathname.split("/")[1].toLowerCase()}/${match[1]}/`;
  } catch {
    return null;
  }
}

export function filterCommentsByUsername(
  comments: PublicComment[],
  username: string,
  limit = 50,
): PublicComment[] {
  const target = normalizeUsername(username);
  return comments
    .filter((comment) => normalizeUsername(comment.username) === target)
    .slice(0, limit);
}

export class MockCommentProvider implements InstagramCommentProvider {
  async searchComments({ postUrls, username, limit = 20 }: CommentSearchOptions): Promise<ProviderSearchResult> {
    const normalized = normalizeUsername(username);
    if (!normalized || postUrls.length === 0) {
      return { comments: [], scannedPosts: 0, provider: "mock" };
    }

    const comments: PublicComment[] = [
      {
        id: "demo-1",
        username: normalized,
        text: "Development result — add APIFY_API_TOKEN to search live public comments.",
        createdAt: new Date().toISOString(),
        postUrl: postUrls[0],
        postCaption: "Development placeholder",
        source: "mock",
      },
    ];

    return { comments: comments.slice(0, limit), scannedPosts: postUrls.length, provider: "mock" };
  }
}
