import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { Blog, BlogWriteInput } from "@/types/blog";

/**
 * Blog posts through /api/v1/admin/blogs. The server owns ids, word counts,
 * publication timestamps and slug uniqueness; responses already match the
 * console's Blog type, so nothing is reshaped here.
 */

export function fetchBlogsForConsole(): Promise<Blog[]> {
  return request<Blog[]>({ method: "GET", url: ENDPOINTS.blogs });
}

export function fetchBlogById(id: string): Promise<Blog> {
  return request<Blog>({ method: "GET", url: `${ENDPOINTS.blogs}/${id}` });
}

/** True when another post (draft or published) already uses the slug. */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const params = new URLSearchParams({ slug });
  if (excludeId) params.set("excludeId", excludeId);
  const result = await request<{ available: boolean }>({ method: "GET", url: `${ENDPOINTS.blogs}/slug-available?${params}` });
  return !result.available;
}

export function createBlog(input: BlogWriteInput): Promise<Blog> {
  return request<Blog>({ method: "POST", url: ENDPOINTS.blogs, data: input });
}

export function updateBlog(id: string, input: BlogWriteInput): Promise<Blog> {
  return request<Blog>({ method: "PUT", url: `${ENDPOINTS.blogs}/${id}`, data: input });
}

export async function deleteBlog(id: string): Promise<void> {
  await request<void>({ method: "DELETE", url: `${ENDPOINTS.blogs}/${id}` });
}

export function publishBlog(id: string): Promise<Blog> {
  return request<Blog>({ method: "POST", url: `${ENDPOINTS.blogs}/${id}/publish` });
}

export function unpublishBlog(id: string): Promise<Blog> {
  return request<Blog>({ method: "POST", url: `${ENDPOINTS.blogs}/${id}/unpublish` });
}
