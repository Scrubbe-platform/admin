import {
  FOLLOW_UP_STATUSES,
  MEETING_STATUSES,
  QUALIFICATIONS,
  SOURCES,
  STAGES,
  type RecordKind,
} from "@/types/acquisition";

export interface FieldSpec {
  key: string;
  label: string;
  /** Defaults to a single-line text input. */
  type?: "text" | "number" | "email" | "date" | "datetime-local" | "textarea" | "company";
  /** Renders a select with these options. */
  options?: readonly string[];
  /** Adds an empty first option, so the field can be left unset. */
  allowBlank?: boolean;
  required?: boolean;
}

/** The form for each record kind, in display order. Validation is built from this too. */
export const FIELDS: Record<RecordKind, FieldSpec[]> = {
  companies: [
    { key: "name", label: "Company name", required: true },
    { key: "website", label: "Website" },
    { key: "source", label: "Source / campaign", options: SOURCES, allowBlank: true },
    { key: "stage", label: "Pipeline stage", options: STAGES, required: true },
    { key: "platform", label: "Current incident-management platform" },
    { key: "team", label: "Engineering team size", type: "number" },
    { key: "volume", label: "Meaningful incidents per month", type: "number" },
    { key: "fit", label: "Qualification", options: QUALIFICATIONS, allowBlank: true },
    { key: "champion", label: "Technical champion" },
    { key: "buyer", label: "Economic buyer" },
    { key: "timeline", label: "Decision timeline" },
    { key: "budget", label: "Budget / procurement" },
    { key: "pain", label: "Customer pain points", type: "textarea" },
    { key: "success", label: "Design partner scope / success criteria", type: "textarea" },
    { key: "next", label: "Agreed next step", type: "textarea" },
  ],
  contacts: [
    { key: "name", label: "Full name", required: true },
    { key: "company", label: "Company", type: "company", required: true },
    { key: "role", label: "Role / title" },
    { key: "email", label: "Work email", type: "email" },
    { key: "profile", label: "Profile or contact channel" },
  ],
  meetings: [
    { key: "title", label: "Meeting title", required: true },
    { key: "company", label: "Company", type: "company", required: true },
    { key: "date", label: "Date / time (Lisbon or London local time)", type: "datetime-local" },
    { key: "status", label: "Meeting status", options: MEETING_STATUSES, required: true },
    { key: "location", label: "Location / call link" },
    { key: "body", label: "Agenda / outcome", type: "textarea" },
  ],
  tasks: [
    { key: "title", label: "Follow-up action", required: true },
    { key: "company", label: "Company", type: "company", required: true },
    { key: "date", label: "Due date", type: "date" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", options: FOLLOW_UP_STATUSES, required: true },
    { key: "body", label: "Details", type: "textarea" },
  ],
  notes: [
    { key: "title", label: "Conversation title", required: true },
    { key: "company", label: "Company", type: "company", required: true },
    { key: "date", label: "Conversation date", type: "date" },
    { key: "body", label: "Conversation notes", type: "textarea", required: true },
  ],
  templates: [
    { key: "title", label: "Template name", required: true },
    { key: "subject", label: "Subject", required: true },
    { key: "body", label: "Email body", type: "textarea", required: true },
  ],
};

/** Singular, lower-case names used in buttons and dialog titles. */
export const RECORD_LABELS: Record<RecordKind, string> = {
  companies: "prospect",
  contacts: "contact",
  meetings: "meeting",
  tasks: "follow-up",
  notes: "note",
  templates: "template",
};
