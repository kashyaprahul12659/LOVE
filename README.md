# Instagram Comment Finder

A provider-based Next.js MVP for finding publicly visible Instagram comments by username.

## What is implemented

- Username normalization and validation
- Public Instagram post/Reel URL validation
- Real Apify adapter for public post comment collection
- Recursive reply normalization
- Exact case-insensitive username matching
- De-duplication by comment ID
- Coverage metadata that states exactly what was searched
- Mock fallback when no provider token is configured
- No login, private-post, DM, follower, or hidden-account access

The current search contract is intentionally **post-scoped**:

1. Enter an Instagram username.
2. Enter a public Instagram post or Reel URL.
3. The configured provider fetches visible comments/replies for that URL.
4. The app filters them to the requested username.

This is the first reliable building block for the broader product. A global "find every comment this username has made" search still needs a separate **post discovery engine**; Instagram does not expose that as an official user-centric comment search endpoint.

## Live provider

The live adapter uses Apify's maintained Instagram Comments Scraper. Apify documents a synchronous run endpoint and inputs including `directUrls` and `resultsLimit`, and its output includes commenter usernames, comment text, timestamps, IDs, replies, and post/comment URLs.

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Then set:

```env
APIFY_API_TOKEN=your_token
APIFY_INSTAGRAM_COMMENTS_ACTOR=apify~instagram-comment-scraper
```

Install and run:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Architecture

```text
UI
  -> /api/comments
      -> InstagramCommentProvider
          -> ApifyInstagramCommentProvider
          -> MockCommentProvider (local development)
```

The provider interface keeps future discovery and alternate vendors separate from the UI and route layer.

## Next milestone

Add a discovery queue that can generate candidate public post URLs from explicitly supplied accounts/hashtags, then send those URLs through the same comment provider and matching pipeline. Do not claim complete Instagram-wide coverage unless the search scope actually supports it.
