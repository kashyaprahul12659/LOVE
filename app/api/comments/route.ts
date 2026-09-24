import { NextRequest, NextResponse } from "next/server";
import type { SearchCoverage } from "@/lib/types";
import {
  filterCommentsByUsername,
  isValidUsername,
  normalizePostUrl,
  normalizeUsername,
  MockCommentProvider,
} from "@/lib/instagram/provider";
import { normalizeDiscoverySource } from "@/lib/instagram/discovery";
import { ApifyInstagramCommentProvider } from "@/lib/instagram/providers/apify";
import { ApifyInstagramPostDiscoveryProvider } from "@/lib/instagram/providers/apify-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export async function GET(request: NextRequest) {
  const username = normalizeUsername(request.nextUrl.searchParams.get("username") ?? "");

  const directPostUrls = uniqueNonEmpty(
    request.nextUrl.searchParams
      .getAll("postUrl")
      .flatMap((value) => value.split(/\r?\n/))
      .map((value) => normalizePostUrl(value))
      .filter((value): value is string => Boolean(value)),
  );

  const rawSources = uniqueNonEmpty(
    request.nextUrl.searchParams
      .getAll("source")
      .flatMap((value) => value.split(/\r?\n/)),
  );

  const sources = rawSources
    .map(normalizeDiscoverySource)
    .filter((value): value is NonNullable<ReturnType<typeof normalizeDiscoverySource>> => Boolean(value))
    .slice(0, 5);

  if (!username || !isValidUsername(username)) {
    return NextResponse.json(
      { error: "Enter a valid Instagram username." },
      { status: 400 },
    );
  }

  if (directPostUrls.length === 0 && sources.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add at least one public post/Reel URL or a discovery source such as a profile username or #hashtag.",
      },
      { status: 422 },
    );
  }

  const token = process.env.APIFY_API_TOKEN?.trim();

  if (sources.length > 0 && !token) {
    return NextResponse.json(
      {
        error:
          "Live discovery needs APIFY_API_TOKEN. Direct post URL searches can still run in local mock mode.",
      },
      { status: 503 },
    );
  }

  const commentProvider = token
    ? new ApifyInstagramCommentProvider(token)
    : new MockCommentProvider();

  try {
    let postUrls = directPostUrls;
    let discoveredPosts = 0;

    if (sources.length > 0) {
      const discoveryProvider = new ApifyInstagramPostDiscoveryProvider(token!);
      const discovered = await discoveryProvider.discoverPosts({
        sources,
        limitPerSource: 12,
      });

      postUrls = uniqueNonEmpty([...postUrls, ...discovered]).slice(0, 60);
      discoveredPosts = discovered.length;
    }

    if (postUrls.length === 0) {
      const coverage: SearchCoverage = {
        mode: sources.length > 0 ? "discovery" : "post-url",
        requestedSources: sources.length,
        discoveredPosts: 0,
        scannedPosts: 0,
        provider: token ? "apify" : "mock",
        note: "No public post URLs were returned for the supplied search scope.",
      };

      return NextResponse.json({
        username,
        count: 0,
        comments: [],
        coverage,
      });
    }

    const result = await commentProvider.searchComments({
      username,
      postUrls,
      limit: 100,
      includeReplies: true,
    });

    const coverage: SearchCoverage = {
      mode: sources.length > 0 ? "discovery" : "post-url",
      requestedSources: sources.length,
      discoveredPosts,
      scannedPosts: result.scannedPosts,
      provider: result.provider,
      note:
        sources.length > 0
          ? "Bounded discovery search: supplied profiles/hashtags were expanded into a limited set of public posts, then provider-visible comments were matched."
          : "Search is limited to the public post/Reel URLs supplied and to the comments returned by the provider.",
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
      {
        error:
          error instanceof Error
            ? error.message
            : "Instagram comment search failed.",
      },
      { status: 502 },
    );
  }
}
