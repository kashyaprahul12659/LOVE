# Instagram Comment Finder

A provider-based Next.js MVP for finding publicly visible Instagram comments by username.

## What is implemented

- Username normalization and validation
- Public Instagram post/Reel URL validation
- Real Apify adapter for public post comment collection
- Profile/hashtag discovery adapter using Apify's Instagram scraper
- Bounded discovery -> post collection -> username matching
- Recursive reply normalization
- Exact case-insensitive username matching
- De-duplication by comment ID
- Coverage metadata that states the actual search scope
- Mock fallback for direct post searches when no provider token is configured
- No login, private-post, DM, follower, or hidden-account access

## Search modes

### Direct posts

Enter a username plus one or more public post/Reel URLs. The app fetches the provider-visible comments for those posts and returns only comments whose author matches the target username.

### Discovery seeds

Enter a username plus one or more public discovery sources. A source can be:

- `@profile`
- `profile:profile`
- `#hashtag`

The app expands up to 5 sources into a bounded set of public posts (currently 12 posts per source), then passes those posts through the same comment provider.

This is intentionally **not** described as an Instagram-wide search. A username-centric global comment index is not available from Instagram's official API, and complete coverage would require scanning an infeasible amount of public content.

## Live provider

The live adapters use Apify's maintained actors:

- `apify~instagram-comment-scraper` for comments/replies
- `apify~instagram-api-scraper` for profile/hashtag -> post discovery

Apify documents the comment scraper's `directUrls` + `resultsLimit` input and a synchronous run endpoint. Its Instagram API Scraper also supports `directUrls`, `resultsType: "posts"`, and `resultsLimit` for post discovery.

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set your token:

```env
APIFY_API_TOKEN=your_token
```

Optional actor overrides:

```env
APIFY_INSTAGRAM_COMMENTS_ACTOR=apify~instagram-comment-scraper
APIFY_INSTAGRAM_DISCOVERY_ACTOR=apify~instagram-api-scraper
```

Then:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Open the app, enter the username you are looking for, and add either direct post URLs or discovery sources.

## Architecture

```text
UI
  -> /api/comments
      -> optional discovery
          -> InstagramPostDiscoveryProvider
              -> ApifyInstagramPostDiscoveryProvider
      -> comment collection
          -> InstagramCommentProvider
              -> ApifyInstagramCommentProvider
              -> MockCommentProvider
      -> normalize + username match
```

The provider interfaces keep discovery vendors and collection vendors independent of the UI and route layer.

## Important scope limitation

The product can search public comments within the posts it receives. It cannot truthfully guarantee "every comment this username has ever made" because there is no complete user-centric public comment index and discovery is bounded by the selected sources and provider limits.

## Next milestone

Move long-running discovery/collection into a job queue and persist normalized posts/comments in PostgreSQL. That will make broad searches asynchronous, resumable, de-duplicated across runs, and measurable by search scope.
