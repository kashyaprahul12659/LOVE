import { NextRequest, NextResponse } from "next/server";
import type { SearchCoverage } from "@/lib/types";
import {
  isValidUsername,
  normalizePostUrl,
  normalizeUsername,
  filterCommentsByUsername,
  MockCommentProvider,
} from "@/lib/instagram/provider";
import { ApifyInstagramCommentProvider } from "@/lib/instagram/providers/apify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const username = normalizeUsername(request.nextUrl.searchParams.get("username") ?? "");
  const postUrl = request.nextUrl.searchParams.get("postUrl")?.trim() ?? "";

  if (!username || !isValidUsername(username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }

  if (!postUrl) {
    return NextResponse.json(
      {
        error:
          "Post discovery is not enabled yet. Add at least one public Instagram post or Reel URL to search its visible comments.",
      },
      { status: 422 },
    );
  }

  const normalizedPostUrl = normalizePostUrl(postUrl);
  if (!normalizedPostUrl) {
    return NextResponse.json(
      { error: "Enter a public Instagram post, Reel, or TV URL." },
      { status: 400 },
    );
  }

  const token = process.env.APIFY_API_TOKEN?.trim();
  const provider = token
    ? new ApifyInstagramCommentProvider(token)
    : new MockCommentProvider();

  try {
    const result = await provider.searchComments({
      username,
      postUrls: [normalizedPostUrl],
      limit: 100,
      includeReplies: true,
    });

    const coverage: SearchCoverage = {
      mode: "post-url",
      requestedPosts: 1,
      scannedPosts: result.scannedPosts,
      provider: result.provider,
      completeForScope: Boolean(token),
      note: token
        ? "Complete for the selected public post/reel URLs returned by the provider. This does not mean all Instagram posts were searched."
        : "Mock mode: add APIFY_API_TOKEN to enable live provider searches.",
    };

    return NextResponse.json({
      username,
      count: filterCommentsByUsername(result.comments, username, 100).length,
      comments: result.comments,
      coverage,
    });
  } catch (error) {
    console.error("Instagram comment search failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Instagram comment search failed." },
      { status: 502 },
    );
  }
}
