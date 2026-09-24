export type DiscoverySource = {
  kind: "profile" | "hashtag";
  value: string;
  url: string;
};

export type PostDiscoveryOptions = {
  sources: DiscoverySource[];
  limitPerSource?: number;
};

export interface InstagramPostDiscoveryProvider {
  discoverPosts(options: PostDiscoveryOptions): Promise<string[]>;
}

export function normalizeDiscoverySource(value: string): DiscoverySource | null {
  const raw = value.trim();
  if (!raw) return null;

  const withoutAt = raw.replace(/^@/, "");
  const hashtag = withoutAt.replace(/^#/, "");

  if (raw.startsWith("#") || raw.toLowerCase().startsWith("hashtag:")) {
    const tag = raw.replace(/^hashtag:/i, "").replace(/^#/, "").trim().toLowerCase();
    if (!/^[a-z0-9._]{1,100}$/i.test(tag)) return null;
    return {
      kind: "hashtag",
      value: tag,
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`,
    };
  }

  if (raw.toLowerCase().startsWith("profile:")) {
    const profile = raw.replace(/^profile:/i, "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/i.test(profile)) return null;
    return {
      kind: "profile",
      value: profile,
      url: `https://www.instagram.com/${encodeURIComponent(profile)}/`,
    };
  }

  if (/^[a-z0-9._]{1,30}$/i.test(withoutAt)) {
    return {
      kind: "profile",
      value: withoutAt.toLowerCase(),
      url: `https://www.instagram.com/${encodeURIComponent(withoutAt)}/`,
    };
  }

  if (/^[a-z0-9._]{1,100}$/i.test(hashtag)) {
    return {
      kind: "hashtag",
      value: hashtag.toLowerCase(),
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`,
    };
  }

  return null;
}
