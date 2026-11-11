import { z } from "zod";

import { isValidIsoDate } from "@/lib/date";
import { DEPARTMENTS, EMPLOYMENT_TYPES, JOB_LEVELS } from "@/types/job";

/**
 * The original schema's rules are preserved, with two changes:
 *   applicationDeadline  mm/dd/yy -> ISO 8601 (YYYY-MM-DD)
 *   responsibilities / requirements / benefits  string -> string[]
 *
 * The character limits from the original string fields are enforced against the
 * joined length of the bullets, so nothing that used to fit stops fitting.
 */

const BULLET_MAX = 300;

function bulletList(options: { min: number; max: number; label: string }) {
  return z
    .array(
      z
        .string()
        .trim()
        .min(3, "A bullet needs at least 3 characters.")
        .max(BULLET_MAX, `Keep each bullet under ${BULLET_MAX} characters.`),
    )
    .min(1, `Add at least one ${options.label} bullet.`)
    .refine(
      (items) => items.join("\n").length >= options.min,
      `${options.label} needs at least ${options.min} characters in total.`,
    )
    .refine(
      (items) => items.join("\n").length <= options.max,
      `${options.label} is capped at ${options.max} characters in total.`,
    );
}

export const jobFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give the role a title of at least 5 characters.")
    .max(100, "Titles are capped at 100 characters."),

  department: z.enum(DEPARTMENTS, { errorMap: () => ({ message: "Pick a department." }) }),

  employmentType: z.enum(EMPLOYMENT_TYPES, { errorMap: () => ({ message: "Pick an employment type." }) }),

  location: z
    .string()
    .trim()
    .min(3, "Where is this role based?")
    .max(100, "Locations are capped at 100 characters."),

  jobLevel: z.enum(JOB_LEVELS, { errorMap: () => ({ message: "Pick a level." }) }),

  salaryRange: z
    .string()
    .trim()
    .min(3, "Add a salary range, for example 60k-90k/year.")
    .max(80, "Salary ranges are capped at 80 characters."),

  description: z
    .string()
    .trim()
    .min(100, "The description needs at least 100 characters.")
    .max(5000, "The description is capped at 5000 characters."),

  responsibilities: bulletList({ min: 50, max: 5000, label: "Responsibilities" }),
  requirements: bulletList({ min: 50, max: 5000, label: "Requirements" }),

  benefits: z
    .array(z.string().trim().min(3).max(BULLET_MAX))
    .max(30, "Thirty benefit bullets is the limit.")
    .refine((items) => items.join("\n").length <= 3000, "Benefits are capped at 3000 characters in total."),

  applicationDeadline: z
    .string()
    .trim()
    .refine(isValidIsoDate, "Pick a valid date."),

  applicationLink: z.union([z.string().trim().url("That is not a valid URL."), z.null()]),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const emptyJobForm: JobFormValues = {
  title: "",
  department: "Engineering",
  employmentType: "Full-Time",
  location: "",
  jobLevel: "Mid-Level",
  salaryRange: "",
  description: "",
  responsibilities: [],
  requirements: [],
  benefits: [],
  applicationDeadline: "",
  applicationLink: null,
};
