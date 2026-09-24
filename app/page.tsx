"use client";

import { FormEvent, useMemo, useState } from "react";
import type { PublicComment, SearchCoverage } from "@/lib/types";

export default function Home() {
  const [username, setUsername] = useState("");
  const [postUrls, setPostUrls] = useState("");
  const [sources, setSources] = useState("");
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [coverage, setCoverage] = useState<SearchCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanUsername = useMemo(
    () => username.replace(/^@+/, "").trim(),
    [username],
  );

  async function search(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setComments([]);
    setCoverage(null);

    try {
      const params = new URLSearchParams({ username: cleanUsername });

      for (const url of postUrls
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)) {
        params.append("postUrl", url);
      }

      for (const source of sources
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)) {
        params.append("source", source);
      }

      const response = await fetch(
        `/api/comments?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Search failed");

      setComments(data.comments ?? []);
      setCoverage(data.coverage ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const canSearch =
    cleanUsername && (postUrls.trim().length > 0 || sources.trim().length > 0);

  return (
    <main className="shell">
      <div className="container">
        <div className="eyebrow">Public comment search · MVP</div>
        <h1>
          Find a username
          <br />
          inside comments.
        </h1>
        <p className="subtitle">
          Match a username against publicly visible Instagram comments. Start
          with exact public posts, or seed a bounded discovery search with
          profiles and hashtags.
        </p>

        <form className="searchCard" onSubmit={search}>
          <label>
            Username to find
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              autoComplete="off"
              spellCheck={false}
              aria-label="Instagram username"
            />
          </label>

          <label>
            Public post / Reel URLs <span>(one per line, optional)</span>
            <textarea
              value={postUrls}
              onChange={(e) => setPostUrls(e.target.value)}
              placeholder={
                "https://www.instagram.com/p/.../\nhttps://www.instagram.com/reel/.../"
              }
              rows={3}
              spellCheck={false}
              aria-label="Public Instagram post or Reel URLs"
            />
          </label>

          <label>
            Discovery sources <span>(one per line, optional)</span>
            <textarea
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder={"@nasa\n#space\nprofile:nationalgeographic"}
              rows={3}
              spellCheck={false}
              aria-label="Instagram discovery sources"
            />
          </label>

          <button disabled={Boolean(!canSearch || loading)}>
            {loading ? "Searching…" : "Search comments"}
          </button>
        </form>

        <div className="notice">
          Public-data only. Discovery is deliberately bounded and does not
          claim to search all of Instagram. No private posts, DMs, followers,
          or hidden account data are accessed.
        </div>

        {error && <div className="notice error">{error}</div>}

        {coverage && (
          <div className="coverage">
            {coverage.requestedSources > 0 && (
              <span>
                {coverage.requestedSources} discovery source
                {coverage.requestedSources === 1 ? "" : "s"}
              </span>
            )}
            <span>{coverage.discoveredPosts} posts discovered</span>
            <span>{coverage.scannedPosts} posts scanned</span>
            <span>{coverage.provider}</span>
          </div>
        )}

        {coverage && <p className="scopeNote">{coverage.note}</p>}

        <section className="results" aria-live="polite">
          {!loading && coverage && comments.length === 0 && (
            <div className="empty">
              No matching comment was returned for this search scope.
            </div>
          )}

          {comments.map((comment) => (
            <article className="card" key={comment.id}>
              <div className="cardHeader">
                <strong>@{comment.username}</strong>
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleString()}
                </time>
              </div>

              <p className="comment">{comment.text}</p>

              <div className="meta">
                {comment.likesCount !== undefined && (
                  <span>♥ {comment.likesCount}</span>
                )}
                {comment.repliesCount !== undefined && (
                  <span>↳ {comment.repliesCount}</span>
                )}
                {comment.isVerified && <span>Verified</span>}
                <span>{comment.source}</span>
              </div>

              <div className="links">
                <a
                  href={comment.postUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open post
                </a>
                {comment.commentUrl && (
                  <a
                    href={comment.commentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open comment
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
