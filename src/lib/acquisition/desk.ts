import { isValidIsoDate } from "@/lib/date";
import type { MeetingLeadValues } from "@/schemas/acquisition";
import {
  STAGES,
  type Desk,
  type DeskRecord,
  type EmailTemplate,
  type Prospect,
  type RecordKind,
} from "@/types/acquisition";

/** Pure functions over the desk. Each change returns a new desk for the caller to save. */

export const STARTER_TEMPLATES: EmailTemplate[] = [
  {
    id: "starter-0",
    title: "Web Summit follow-up",
    subject: "Good meeting you at Web Summit",
    body: "Hi {{first_name}},\n\nGood meeting you in Lisbon. You mentioned {{pain_point}} at {{company}}. How does your team handle that today, and which incident-management platform are you using?\n\nI’d be happy to compare notes on a short call.\n\nPaschal",
  },
  {
    id: "starter-1",
    title: "Discovery invitation",
    subject: "Incident response at {{company}}",
    body: "Hi {{first_name}},\n\nScrubbe helps engineering teams investigate and diagnose incidents automatically. Remediation runs within your policies, with human approval where required.\n\nCould we spend 20 minutes walking through a recent incident and where your team lost the most time?\n\nPaschal",
  },
  {
    id: "starter-2",
    title: "Design partner proposal",
    subject: "A design partnership with Scrubbe",
    body: "Hi {{first_name}},\n\nBased on our conversation about {{pain_point}}, I’d like to scope a design partnership with {{company}}. We can agree on one service, the actions Scrubbe can take, the approvals it needs, and how we’ll measure success.\n\nCould we review the scope with your engineering lead?\n\nPaschal",
  },
  {
    id: "starter-3",
    title: "Commercial next step",
    subject: "Scrubbe rollout at {{company}}",
    body: "Hi {{first_name}},\n\nCould we review the pilot outcomes and confirm which services, incident volumes, and capabilities should go into a rollout quote? If there’s someone who should join for the buying or security review, please bring them along.\n\nPaschal",
  },
];

export function emptyDesk(): Desk {
  return {
    companies: [],
    contacts: [],
    meetings: [],
    tasks: [],
    notes: [],
    templates: STARTER_TEMPLATES.map((template) => ({ ...template })),
  };
}

/** Today as YYYY-MM-DD in London, where the team works, so "overdue" flips at their midnight. */
export function todayInLondon(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "2026-11-12T14:30" -> "12 Nov 2026 · 14:30". Times are local wall-clock, so no zone shifting. */
export function formatWhen(value: string | undefined): string {
  if (!value) return "Date to be confirmed";
  const [day = "", time] = value.split("T");
  if (!isValidIsoDate(day)) return value;
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return time ? `${label} · ${time.slice(0, 5)}` : label;
}

/** Earliest first; records without a date go last. */
export function sortByDate<T extends DeskRecord>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

export function findRecord(desk: Desk, kind: RecordKind, id: string): DeskRecord | undefined {
  const list: DeskRecord[] = desk[kind];
  return list.find((record) => record.id === id);
}

export function findProspect(desk: Desk, id: string | undefined): Prospect | undefined {
  return id ? desk.companies.find((prospect) => prospect.id === id) : undefined;
}

export function upsertRecord(desk: Desk, kind: RecordKind, entry: DeskRecord): Desk {
  const list: DeskRecord[] = desk[kind];
  const exists = list.some((record) => record.id === entry.id);
  const next = exists ? list.map((record) => (record.id === entry.id ? entry : record)) : [...list, entry];
  return { ...desk, [kind]: next } as Desk;
}

/** Deleting a prospect also deletes everything filed under it. */
export function deleteRecord(desk: Desk, kind: RecordKind, id: string): Desk {
  const list: DeskRecord[] = desk[kind];
  const next = { ...desk, [kind]: list.filter((record) => record.id !== id) } as Desk;
  if (kind !== "companies") return next;
  return {
    ...next,
    contacts: next.contacts.filter((record) => record.company !== id),
    notes: next.notes.filter((record) => record.company !== id),
    meetings: next.meetings.filter((record) => record.company !== id),
    tasks: next.tasks.filter((record) => record.company !== id),
  };
}

export function markFollowUpDone(desk: Desk, id: string): Desk {
  return { ...desk, tasks: desk.tasks.map((task) => (task.id === id ? { ...task, status: "Done" } : task)) };
}

/** Files a prospect, contact and meeting in one go. A company already on the desk is reused by name. */
export function addMeetingLead(desk: Desk, lead: MeetingLeadValues): Desk {
  const companies = [...desk.companies];
  let prospect = companies.find((company) => company.name.toLowerCase() === lead.company.toLowerCase());
  if (!prospect) {
    prospect = { id: crypto.randomUUID(), name: lead.company, stage: "Contacted", source: "", platform: "" };
    companies.push(prospect);
  }

  const contacts = lead.contact
    ? [
        ...desk.contacts,
        { id: crypto.randomUUID(), name: lead.contact, company: prospect.id, role: lead.role, email: lead.email, profile: "" },
      ]
    : desk.contacts;

  const meetings = [
    ...desk.meetings,
    {
      id: crypto.randomUUID(),
      title: lead.title,
      company: prospect.id,
      date: lead.date,
      status: lead.status,
      location: lead.location,
      body: lead.body,
    },
  ];

  return { ...desk, companies, contacts, meetings };
}

/** Everything the overview shows, scoped to one campaign or to all of them. */
export function deskOverview(desk: Desk, campaign: string) {
  const prospects = desk.companies.filter((prospect) => !campaign || prospect.source === campaign);
  const ids = new Set(prospects.map((prospect) => prospect.id));
  const meetings = desk.meetings.filter((meeting) => ids.has(meeting.company));
  const openFollowUps = desk.tasks.filter((task) => ids.has(task.company) && task.status !== "Done");
  const today = todayInLondon();
  const stageIndex = (stage: string) => (STAGES as readonly string[]).indexOf(stage);

  return {
    prospects,
    inOutreach: prospects.filter((p) => stageIndex(p.stage) > 0 && p.stage !== "Closed / nurture").length,
    payingCustomers: prospects.filter((p) => p.stage === "Paying customer").length,
    designPartners: prospects.filter((p) => p.stage === "Design partner").length,
    bookedMeetings: meetings.filter((meeting) => meeting.status === "Booked"),
    heldMeetings: meetings.filter((meeting) => meeting.status === "Held").length,
    openFollowUps,
    overdueFollowUps: openFollowUps.filter((task) => task.date && task.date < today).length,
    stageCounts: STAGES.map((stage) => ({ stage, count: prospects.filter((p) => p.stage === stage).length })),
  };
}
