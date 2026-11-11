import { notWired } from "@/lib/api/endpoints";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONLY FILE THAT TOUCHES IMAGE UPLOAD. Swapping in the real endpoint is a
 *  change to this file and nothing else.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Status: NOT WIRED. No media endpoint has been confirmed. The main app uses
 *  an S3-style presign for incident attachments
 *  (POST /incident-ticket/attachments/presign), so a content equivalent may
 *  exist — that is a hypothesis, not a finding, and it is not called here.
 *
 *  TODO(scrubbe-api): confirm the media endpoint, then implement `presignDriver`
 *  below and set ACTIVE_DRIVER to it. Nothing outside this file changes.
 *
 *  Until then the editor's cover-image field accepts a pasted URL, which works
 *  today against whatever host already serves the marketing site's images.
 */

export interface UploadResult {
  url: string;
}

export type UploadDriver = (file: File) => Promise<UploadResult>;

/** Throws NotWiredError so an unwired upload is visible, never a fake URL. */
const unwiredDriver: UploadDriver = async (_file: File): Promise<UploadResult> => {
  return notWired("media.upload");
};

/**
 * Sketch of the presign flow, left unimplemented on purpose. Filling this in
 * requires the real path, the real request body and the real response fields.
 *
 * const presignDriver: UploadDriver = async (file) => {
 *   const { uploadUrl, publicUrl } = await request<{ uploadUrl: string; publicUrl: string }>({
 *     method: "POST",
 *     url: "<confirmed presign path>",
 *     data: { fileName: file.name, contentType: file.type, size: file.size },
 *   });
 *   await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
 *   return { url: publicUrl };
 * };
 */

const ACTIVE_DRIVER: UploadDriver = unwiredDriver;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;

export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Cover images must be PNG, JPEG, WebP or AVIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Cover images must be under 5 MB.";
  }
  return null;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  return ACTIVE_DRIVER(file);
}
