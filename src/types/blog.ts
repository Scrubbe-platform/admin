/**
 * The blog model reconciles the two shapes that existed in the frontend:
 *   (a) the public card projection — category, excerpt, readingTime, author, isFeatured
 *   (b) the admin form input    — blogContent, tags, seoSlug, coverImage
 *
 * Derived values from (a) are deliberately NOT stored:
 *   readingTime  -> computed from wordCount at render (see lib/reading-time.ts)
 *   initials     -> computed from author.name (see lib/author.ts)
 *   avatarColor  -> stable hash of author.name (see lib/author.ts)
 *   publishedAt  -> ISO 8601, formatted at render, never stored pre-formatted
 *
 * NOT YET CONFIRMED against the backend. `GET /admin/public/blogs` returns an
 * empty array, so no live record has ever validated these field names. Treat
 * this as the proposal, not as a verified contract.
 */

export const BLOG_CATEGORIES = [
  "Deep Dive",
  "Tutorial",
  "Release",
  "Customer story",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogAuthor {
  id: string;
  name: string;
  role?: string;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown body. Named `blogContent` in the old admin form. */
  content: string;
  category: BlogCategory;
  tags: string[];
  status: BlogStatus;
  coverImageUrl: string | null;
  author: BlogAuthor;
  isFeatured: boolean;
  /** Computed on save. Reading time is derived from this, never typed. */
  wordCount: number;
  /** ISO 8601, or null while the post is a draft. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update. Server owns id, wordCount, timestamps, status. */
export interface BlogWriteInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  coverImageUrl: string | null;
  authorName: string;
  authorRole: string | null;
  isFeatured: boolean;
}
