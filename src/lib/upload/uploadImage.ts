import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

/**
 * Cover-image upload. The API stores the file (checking its real content, not
 * just its declared type) and returns a permanent public URL it serves itself.
 */
export interface UploadResult {
  url: string;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Must match the server's list. SVG is deliberately not accepted. */
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Cover images must be PNG, JPEG, WebP or GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Cover images must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  form.append("file", file);
  const result = await request<{ url: string }>({
    method: "POST",
    url: ENDPOINTS.media,
    data: form,
    // Let the browser set the multipart boundary.
    headers: { "Content-Type": undefined },
    timeout: 60_000,
  });
  return { url: result.url };
}
