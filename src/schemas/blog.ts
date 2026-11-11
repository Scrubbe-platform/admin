import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/slug";
import { BLOG_CATEGORIES } from "@/types/blog";

/**
 * Carries over every rule from the existing (unwired) admin form, then adds the
 * fields the public card needs. `readingTime` is absent on purpose — it is
 * computed from the body. `initials` and `avatarColor` are absent for the same
 * reason.
 */

const TAG_PATTERN = /^#?[\w\d]+(?:-[\w\d]+)*$/i;

/** Sized to the blog card: beyond this the public layout truncates. */
export const EXCERPT_MAX = 180;

export const blogFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give the post a title of at least 5 characters.")
    .max(100, "Titles are capped at 100 characters."),

  slug: z
    .string()
    .trim()
    .min(3, "The slug needs at least 3 characters.")
    .max(120, "Slugs are capped at 120 characters.")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens."),

  excerpt: z
    .string()
    .trim()
    .min(40, "Write at least 40 characters so the card has something to show.")
    .max(EXCERPT_MAX, `The card truncates past ${EXCERPT_MAX} characters.`),

  content: z
    .string()
    .trim()
    .min(50, "The body needs at least 50 characters."),

  category: z.enum(BLOG_CATEGORIES, {
    errorMap: () => ({ message: "Pick a category." }),
  }),

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Tags need at least 2 characters.")
        .max(50, "Tags are capped at 50 characters.")
        .regex(TAG_PATTERN, "Tags can use letters, numbers and single hyphens."),
    )
    .min(1, "Add at least one tag.")
    .max(10, "Ten tags is the limit."),

  // Nullable rather than transformed, so the form's input and output types
  // stay identical and the resolver needs no cast.
  coverImageUrl: z.union([z.string().trim().url("That is not a valid image URL."), z.null()]),

  authorName: z
    .string()
    .trim()
    .min(2, "Who wrote this?")
    .max(80, "Author names are capped at 80 characters."),

  authorRole: z.union([z.string().trim().max(80, "Author roles are capped at 80 characters."), z.null()]),

  isFeatured: z.boolean(),
});

export type BlogFormValues = z.infer<typeof blogFormSchema>;

export const emptyBlogForm: BlogFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "Deep Dive",
  tags: [],
  coverImageUrl: null,
  authorName: "",
  authorRole: null,
  isFeatured: false,
};
