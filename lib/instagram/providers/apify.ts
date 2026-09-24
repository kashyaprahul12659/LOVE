import type { PublicComment } from "@/lib/types";
import {
  filterCommentsByUsername,
  normalizePostUrl,
  normalizeUsername,
  type CommentSearchOptions,
  type InstagramCommentProvider,
  type ProviderSearchResult,
} from "@/lib/instagram/provider";

type ApifyCommentRecord = {
  id?: string | number;
  commentId?: string | number;
  pk?: string | number;
  text?: string | null;
  ownerUsername?: string | null;
  username?: string | null;
  ownerId?: string | number | null;
  userId?: string | number | null;
  timestamp?: string | number | null;
  createdAt?: string | number | null;
  commentUrl?: string | null;
  url?: string | null;
  postUrl?: string | null;
  inputUrl?: string | null;
  postCaption?: string | null;
  caption?: string | null;
  ownerProfilePicUrl?: string | null;
  profilePicUrl?: string | null;
  ownerIsVerified?: boolean | null;
  isVerified?: boolean | null;
  likesCount?: number | null;
  likeCount?: number | null;
  likes?: number | null;
  repliesCount?: number | null;
  replyCount?: number | null;
  childCommentCount?: number | null;
  replies?: ApifyCommentRecord[] | null;
  user?: { username?: string | null; id?: string | number | null } | null;
  owner?: { username?: string | null; id?: string | number | null; profilePicUrl?: string | null } | null;
  [key: string]: unknown;
};

function toIso(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return toIso(numeric);
  }

  return new Date().toISOString();
}

function firstString(...values: Array<string | number | null | undefined>): string | undefined {
  return values.find((value): value is string | number => value !== null && value !== undefined && String(value).trim() !== "")?.toString();
}

function normalizeRecord(record: ApifyCommentRecord, fallbackPostUrl: string): PublicComment | null {
  const username =
    firstString(
      record.ownerUsername,
      record.username,
      record.user?.username,
      record.owner?.username,
    );

  const text = firstString(record.text);
  if (!username || text === undefined) return null;

  const id = firstString(record.id, record.commentId, record.pk);
  if (!id) return null;

  const postUrl = normalizePostUrl(
    firstString(record.postUrl, record.inputUrl, fallbackPostUrl) ?? fallbackPostUrl,
  ) ?? fallbackPostUrl;

  const ownerId = firstString(record.ownerId, record.userId, record.user?.id, record.owner?.id);
  const profilePicUrl = firstString(record.ownerProfilePicUrl, record.profilePicUrl, record.owner?.profilePicUrl);
  const likesCount = record.likesCount ?? record.likeCount ?? record.likes ?? undefined;
  const repliesCount = record.repliesCount ?? record.replyCount ?? record.childCommentCount ?? undefined;

  return {
    id: String(id),
    username: normalizeUsername(username),
    userId: ownerId,
    text,
    createdAt: toIso(record.timestamp ?? record.createdAt),
    postUrl,
    postCaption: firstString(record.postCaption, record.caption),
    commentUrl: firstString(record.commentUrl, record.url),
    profilePicUrl,
    isVerified: record.ownerIsVerified ?? record.isVerified ?? undefined,
    likesCount,
    repliesCount,
    source: "apify",
  };
}

function flattenRecords(
  records: ApifyCommentRecord[],
  fallbackPostUrl: string,
  includeReplies: boolean,
): PublicComment[] {
  const output: PublicComment[] = [];

  const visit = (record: ApifyCommentRecord, depth: number) => {
    const normalized = normalizeRecord(record, fallbackPostUrl);
    if (normalized) output.push(normalized);

    if (includeReplies && depth < 8 && Array.isArray(record.replies)) {
      for (const reply of record.replies) visit(reply, depth + 1);
    }
  };

  for (const record of records) visit(record, 0);
  return output;
}

export class ApifyInstagramCommentProvider implements InstagramCommentProvider {
  constructor(
    private readonly token: string,
    private readonly actorId = process.env.APIFY_INSTAGRAM_COMMENTS_ACTOR ?? "apify~instagram-comment-scraper",
  ) {}

  async searchComments({
    username,
    postUrls,
    limit = 50,
    includeReplies = true,
  }: CommentSearchOptions): Promise<ProviderSearchResult> {
    const normalizedPosts = postUrls
      .map(normalizePostUrl)
      .filter((value): value is string => Boolean(value));

    if (normalizedPosts.length === 0) {
      return { comments: [], scannedPosts: 0, provider: "apify" };
    }

    const endpoint = new URL(
      `https://api.apify.com/v2/actors/${encodeURIComponent(this.actorId)}/run-sync-get-dataset-items`,
    );
    endpoint.searchParams.set("token", this.token);
    endpoint.searchParams.set("format", "json");

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        directUrls: normalizedPosts,
        resultsLimit: limit,
        includeReplies,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Apify request failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ""}`);
    }

    const payload: unknown = await response.json();
    const records = Array.isArray(payload)
      ? payload.filter((value): value is ApifyCommentRecord => Boolean(value && typeof value === "object"))
      : [];

    const allComments = normalizedPosts.flatMap((postUrl) =>
      flattenRecords(records.filter((record) => {
        const candidate = firstString(record.postUrl, record.inputUrl);
        if (!candidate) return normalizedPosts.length === 1;
        return normalizePostUrl(candidate) === postUrl;
      }), postUrl, includeReplies),
    );

    const deduped = Array.from(
      new Map(allComments.map((comment) => [comment.id, comment])).values(),
    );

    return {
      comments: filterCommentsByUsername(deduped, username, limit),
      scannedPosts: normalizedPosts.length,
      provider: `apify:${this.actorId}`,
    };
  }
}
