"use client";

import { FormEvent, useMemo, useState } from "react";
import type { PublicComment, SearchCoverage } from "@/lib/types";

export default function Home() {
  const [username, setUsername] = useState("");
  const [postUrl, setPostUrl] = useState("");
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
      const params = new URLSearchParams({
        username: cleanUsername,
        postUrl: postUrl.trim(),
      });
      const response = await fetch(`/api/comments?${params.toString()}`, {
        cache: "no-store",
      });
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
          Search the visible comments of a public Instagram post or Reel for a
          specific username. Private profiles can still match when their
          comment is publicly visible.
        </p>

        <form className="searchCard" onSubmit={search}>
          <label>
            Instagram username
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
            Public post or Reel URL
            <input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-label="Public Instagram post or Reel URL"
            />
          </label>

          <button disabled={loading || !cleanUsername || !postUrl.trim()}>
            {loading ? "Searching…" : "Search comments"}
          </button>
        </form>

        <div className="notice">
          This MVP only searches the URL you provide. It does not access
          private posts, DMs, followers, or hidden account data. Broader post
          discovery is a separate pipeline.
        </div>

        {error && <div className="notice error">{error}</div>}

        {coverage && (
          <div className="coverage">
            <span>{coverage.scannedPosts} post scanned</span>
            <span>{coverage.provider}</span>
            <span>{coverage.completeForScope ? "Provider result" : "Mock mode"}</span>
          </div>
        )}

        <section className="results" aria-live="polite">
          {!loading && coverage && comments.length === 0 && (
            <div className="empty">No matching comment was returned for this URL.</div>
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
                {comment.likesCount !== undefined && <span>♥ {comment.likesCount}</span>}
                {comment.repliesCount !== undefined && <span>↳ {comment.repliesCount}</span>}
                {comment.isVerified && <span>Verified</span>}
                <span>{comment.source}</span>
              </div>

              <div className="links">
                <a href={comment.postUrl} target="_blank" rel="noreferrer">
                  Open post
                </a>
                {comment.commentUrl && (
                  <a href={comment.commentUrl} target="_blank" rel="noreferrer">
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
