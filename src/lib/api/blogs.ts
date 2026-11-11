import { request } from "@/lib/api/client";
import { CONFIRMED, notWired } from "@/lib/api/endpoints";
import { countWords } from "@/lib/reading-time";
import {
  BLOG_CATEGORIES,
  type Blog,
  type BlogCategory,
  type BlogWriteInput,
} from "@/types/blog";

/**
 * Only the public read is wired. `GET /admin/public/blogs` returns published
 * posts and currently returns []. There is no confirmed admin list endpoint, so
 * drafts are not reachable: the list screen says so rather than pretending.
 */

type UnknownRecord = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asCategory(value: unknown): BlogCategory {
  const found = BLOG_CATEGORIES.find((category) => category === value);
  return found ?? "Deep Dive";
}

/**
 * Normalises a record from the public endpoint into the console's model.
 * Written defensively because no live record has ever been seen: the endpoint
 * has only ever returned an empty array. Field names here are the proposal, not
 * a verified contract.
 */
export function normaliseBlog(raw: UnknownRecord): Blog {
  const content = str(raw["content"]) || str(raw["blogContent"]) || str(raw["body"]);
  const authorRaw = (raw["author"] ?? {}) as UnknownRecord;
  const publishedAt = str(raw["publishedAt"]) || null;
  const tags = Array.isArray(raw["tags"]) ? raw["tags"].filter((tag): tag is string => typeof tag === "string") : [];

  return {
    id: str(raw["id"]) || str(raw["_id"]),
    slug: str(raw["slug"]) || str(raw["seoSlug"]),
    title: str(raw["title"]),
    excerpt: str(raw["excerpt"]),
    content,
    category: asCategory(raw["category"]),
    tags,
    status: publishedAt ? "PUBLISHED" : "DRAFT",
    coverImageUrl: str(raw["coverImageUrl"]) || str(raw["imageUrl"]) || null,
    author: {
      id: str(authorRaw["id"]),
      name: str(authorRaw["name"]),
      ...(str(authorRaw["role"]) ? { role: str(authorRaw["role"]) } : {}),
    },
    isFeatured: raw["isFeatured"] === true,
    wordCount: typeof raw["wordCount"] === "number" ? raw["wordCount"] : countWords(content),
    publishedAt,
    createdAt: str(raw["createdAt"]),
    updatedAt: str(raw["updatedAt"]) || str(raw["createdAt"]),
  };
}

/** WIRED — the one blog read that exists. Published posts only. */
export async function fetchPublishedBlogs(): Promise<Blog[]> {
  const data = await request<UnknownRecord[]>({
    method: "GET",
    url: CONFIRMED.publicRead.blogs,
  });
  if (!Array.isArray(data)) return [];
  return data.map(normaliseBlog);
}

/**
 * No admin list endpoint is confirmed, so the console reads the public list and
 * the UI states plainly that drafts are not included.
 */
export async function fetchBlogsForConsole(): Promise<Blog[]> {
  return fetchPublishedBlogs();
}

export async function fetchBlogById(id: string): Promise<Blog> {
  const all = await fetchPublishedBlogs();
  const found = all.find((blog) => blog.id === id);
  if (!found) {
    throw new Error("That post couldn't be found. It may have been deleted, or the link may be wrong.");
  }
  return found;
}

/**
 * Best-effort uniqueness check against the published list. It cannot see drafts,
 * so it can return "available" for a slug a draft already holds.
 */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const all = await fetchPublishedBlogs();
  return all.some((blog) => blog.slug === slug && blog.id !== excludeId);
}

/* ───────────────── writes — none confirmed ───────────────── */

export async function createBlog(_input: BlogWriteInput): Promise<Blog> {
  return notWired("blogs.create");
}

export async function updateBlog(_id: string, _input: BlogWriteInput): Promise<Blog> {
  return notWired("blogs.update");
}

export async function deleteBlog(_id: string): Promise<void> {
  return notWired("blogs.delete");
}

export async function publishBlog(_id: string): Promise<Blog> {
  return notWired("blogs.publish");
}

export async function unpublishBlog(_id: string): Promise<Blog> {
  return notWired("blogs.unpublish");
}
