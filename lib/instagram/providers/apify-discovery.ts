import type {
  DiscoverySource,
  InstagramPostDiscoveryProvider,
  PostDiscoveryOptions,
} from "@/lib/instagram/discovery";
import { normalizePostUrl } from "@/lib/instagram/provider";

type ApifyPostRecord = {
  url?: string | null;
  permalink?: string | null;
  inputUrl?: string | null;
  shortCode?: string | null;
  [key: string]: unknown;
};

export class ApifyInstagramPostDiscoveryProvider
  implements InstagramPostDiscoveryProvider
{
  constructor(
    private readonly token: string,
    private readonly actorId =
      process.env.APIFY_INSTAGRAM_DISCOVERY_ACTOR ??
      "apify~instagram-api-scraper",
  ) {}

  async discoverPosts({
    sources,
    limitPerSource = 12,
  }: PostDiscoveryOptions): Promise<string[]> {
    if (sources.length === 0) return [];

    const endpoint = new URL(
      `https://api.apify.com/v2/actors/${encodeURIComponent(
        this.actorId,
      )}/run-sync-get-dataset-items`,
    );
    endpoint.searchParams.set("token", this.token);
    endpoint.searchParams.set("format", "json");

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        directUrls: sources.map((source: DiscoverySource) => source.url),
        resultsType: "posts",
        resultsLimit: limitPerSource,
        searchLimit: 1,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Apify discovery failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ""}`,
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return [];

    const urls = payload.flatMap((value) => {
      if (!value || typeof value !== "object") return [];

      const record = value as ApifyPostRecord;
      const normalized = normalizePostUrl(
        record.url ?? record.permalink ?? record.inputUrl ?? "",
      );

      return normalized ? [normalized] : [];
    });

    return Array.from(new Set(urls));
  }
}
