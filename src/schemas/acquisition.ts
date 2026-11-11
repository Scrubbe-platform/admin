import { z } from "zod";

import { FIELDS, type FieldSpec } from "@/lib/acquisition/fields";
import { LEAD_MEETING_STATUSES, type RecordKind } from "@/types/acquisition";

/** Every desk field is stored as the trimmed string the form captured. */
export type RecordValues = Record<string, string>;

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().email().safeParse(value).success, "That is not a valid email.");

function fieldSchema(field: FieldSpec): z.ZodTypeAny {
  if (field.type === "email") {
    return field.required ? z.string().trim().email("That is not a valid email.") : optionalEmail;
  }
  const text = z.string().trim();
  const present = field.required ? text.min(1, `${field.label} is required.`) : text;
  if (field.type === "number") {
    return present.refine((value) => /^\d*$/.test(value), "Use a whole number, zero or more.");
  }
  return present;
}

/** Built from the field list, so a form and its validation can't drift apart. */
export function recordSchema(kind: RecordKind) {
  return z.object(Object.fromEntries(FIELDS[kind].map((field) => [field.key, fieldSchema(field)])));
}

export const meetingLeadSchema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  contact: z.string().trim(),
  role: z.string().trim(),
  email: optionalEmail,
  title: z.string().trim().min(1, "Meeting title is required."),
  date: z.string().trim(),
  status: z.enum(LEAD_MEETING_STATUSES),
  location: z.string().trim(),
  body: z.string().trim(),
});

export type MeetingLeadValues = z.infer<typeof meetingLeadSchema>;
