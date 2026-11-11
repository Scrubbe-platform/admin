/**
 * The acquisition desk keeps its records in this browser's localStorage, in the
 * same shape as the standalone Acquisition Desk page: one object holding six
 * lists. Every field is the string the form captured, so optional fields are
 * simply absent until someone fills them in.
 */

export const STAGES = [
  "Identified",
  "Contacted",
  "Discovery",
  "Qualified",
  "Design partner",
  "Commercial proposal",
  "Paying customer",
  "Closed / nurture",
] as const;

export const SOURCES = ["Web Summit 2026", "Referral", "Outbound", "Inbound", "Other"] as const;

export const QUALIFICATIONS = ["Exploring", "Qualified", "Low fit"] as const;

export const MEETING_STATUSES = ["Proposed", "Booked", "Held", "Cancelled", "No-show"] as const;

/** A meeting lead is captured before the meeting happens, so only these apply. */
export const LEAD_MEETING_STATUSES = ["Proposed", "Booked"] as const;

export const FOLLOW_UP_STATUSES = ["Open", "Done"] as const;

export interface DeskRecord {
  id: string;
  [field: string]: string | undefined;
}

export interface Prospect extends DeskRecord {
  name: string;
  stage: string;
  source?: string;
  website?: string;
  platform?: string;
  team?: string;
  volume?: string;
  fit?: string;
  champion?: string;
  buyer?: string;
  timeline?: string;
  budget?: string;
  pain?: string;
  success?: string;
  next?: string;
}

export interface Contact extends DeskRecord {
  name: string;
  company: string;
  role?: string;
  email?: string;
  profile?: string;
}

export interface Meeting extends DeskRecord {
  title: string;
  company: string;
  status: string;
  date?: string;
  location?: string;
  body?: string;
}

export interface FollowUp extends DeskRecord {
  title: string;
  company: string;
  status: string;
  date?: string;
  owner?: string;
  body?: string;
}

export interface Note extends DeskRecord {
  title: string;
  company: string;
  body: string;
  date?: string;
}

export interface EmailTemplate extends DeskRecord {
  title: string;
  subject: string;
  body: string;
}

/** Keys match the standalone desk's storage format, including `companies` and `tasks`. */
export interface Desk {
  companies: Prospect[];
  contacts: Contact[];
  meetings: Meeting[];
  tasks: FollowUp[];
  notes: Note[];
  templates: EmailTemplate[];
}

export type RecordKind = keyof Desk;
