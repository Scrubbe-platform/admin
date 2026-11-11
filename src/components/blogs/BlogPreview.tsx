"use client";

import { Star } from "lucide-react";

import { avatarColorOf, initialsOf } from "@/lib/author";
import { formatDate } from "@/lib/date";
import { countWords, readingTimeLabel } from "@/lib/reading-time";
import type { BlogCategory } from "@/types/blog";

export interface PreviewPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  coverImageUrl: string | null;
  authorName: string;
  authorRole: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
}

/**
 * Mirrors the public site's card proportions so the editor sees the same
 * truncation the reader will. Derived values (reading time, initials, avatar
 * colour) are computed here exactly as the public site would compute them.
 */
export function BlogCardPreview({ post }: { post: PreviewPost }) {
  const author = post.authorName || "Unnamed author";
  const words = countWords(post.content);

  return (
    <article className="w-[352px] overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative h-44 bg-raised">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-faint">No cover image</div>
        )}
        {post.isFeatured ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-signal-strong px-1.5 py-0.5 text-2xs text-canvas">
            <Star className="h-3 w-3" aria-hidden />
            Featured
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2 text-2xs text-ink-faint">
          <span className="text-signal-strong">{post.category}</span>
          <span aria-hidden>·</span>
          <span>{readingTimeLabel(words)}</span>
        </div>

        <h3 className="line-clamp-2 font-semibold text-lg leading-snug text-ink">
          {post.title || "Untitled post"}
        </h3>

        <p className="line-clamp-3 text-sm leading-6 text-ink-muted">
          {post.excerpt || "The excerpt shows here. Three lines, then it clips."}
        </p>

        <div className="flex items-center gap-2 pt-1.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-2xs text-white"
            style={{ backgroundColor: avatarColorOf(author) }}
            aria-hidden
          >
            {initialsOf(author)}
          </span>
          <div className="min-w-0 text-2xs">
            <p className="truncate text-ink">{author}</p>
            <p className="truncate text-ink-faint">
              {post.publishedAt ? formatDate(post.publishedAt) : "Not published"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BlogDetailPreview({ post, html }: { post: PreviewPost; html: React.ReactNode }) {
  const author = post.authorName || "Unnamed author";
  const words = countWords(post.content);

  return (
    <article className="mx-auto max-w-[68ch]">
      <p className="text-xs text-signal-strong">{post.category}</p>
      <h1 className="mt-2 font-semibold text-3xl leading-tight tracking-tight text-ink">
        {post.title || "Untitled post"}
      </h1>
      <p className="mt-3 text-base leading-7 text-ink-muted">{post.excerpt}</p>

      <div className="mt-5 flex items-center gap-2.5 border-y border-line py-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-white"
          style={{ backgroundColor: avatarColorOf(author) }}
          aria-hidden
        >
          {initialsOf(author)}
        </span>
        <div className="text-xs">
          <p className="text-ink">{author}</p>
          <p className="text-ink-faint">
            {post.authorRole ? `${post.authorRole} · ` : ""}
            {post.publishedAt ? formatDate(post.publishedAt) : "Not published"} · {readingTimeLabel(words)}
          </p>
        </div>
      </div>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-card object-cover" />
      ) : null}

      <div className="mt-6">{html}</div>
    </article>
  );
}
