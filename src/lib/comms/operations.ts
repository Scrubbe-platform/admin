import { DEMO_ACTOR, DEMO_TODAY, findCategory, nowStamp } from "@/lib/comms/catalog";
import { buildTemplate, genericBlocks, genericVariables, newBlockId } from "@/lib/comms/seed";
import type { CategoryId, CommsState, EmailTemplate, ModuleRow, Priority, TriggerType } from "@/types/comms";

/**
 * Recipes for useCommsUpdate: each one mutates the draft state it is given.
 * Some return a value, such as a message to show or a new record's id.
 */

export function logAudit(state: CommsState, action: string, resource = "", status = "Success"): void {
  state.audit.unshift({ ts: nowStamp(), actor: DEMO_ACTOR, action, resource, status });
}

/** An audited change that records what it was, what it became, and why. */
export function logChange(
  state: CommsState,
  action: string,
  resource: string,
  previous: string,
  next: string,
  reason: string,
): void {
  state.audit.unshift({ ts: nowStamp(), actor: DEMO_ACTOR, action, resource, status: "Success", previous, next, reason });
}

export function findTemplate(state: CommsState, id: string): EmailTemplate | undefined {
  return state.templates.find((template) => template.id === id);
}

/**
 * Published and approved versions are immutable, so editing one starts a new
 * draft version. Returns a message when it did, or null when nothing changed.
 */
export function createDraftVersion(state: CommsState, id: string): string | null {
  const template = findTemplate(state, id);
  if (!template || (template.status !== "Published" && template.status !== "Approved")) return null;

  const [major = 1, minor = 0] = template.version.slice(1).split(".").map(Number);
  const previous = template.version;
  const next = `v${major}.${minor + 1}`;
  template.version = next;
  template.status = "Draft";
  template.approval = null;
  template.versions.unshift({
    version: next,
    by: DEMO_ACTOR,
    date: DEMO_TODAY,
    note: `New draft created from published ${previous}`,
    status: "Draft",
    changes: [],
  });
  logAudit(state, `created draft ${next} from published ${previous}`, id, "Draft");
  return `Published versions are immutable. New draft ${next} created.`;
}

export function saveDraft(state: CommsState, draft: EmailTemplate): void {
  const saved: EmailTemplate = structuredClone(draft);
  saved.updated = DEMO_TODAY;
  saved.by = DEMO_ACTOR;
  if (saved.versions[0]) saved.versions[0].date = DEMO_TODAY;
  const index = state.templates.findIndex((template) => template.id === saved.id);
  if (index >= 0) state.templates[index] = saved;
  logAudit(state, `saved draft ${saved.version}`, saved.id, "Draft");
}

function nextTemplateId(state: CommsState, category: CategoryId): string {
  const prefix = findCategory(category)?.prefix ?? category.toUpperCase();
  let n = state.templates.filter((template) => template.category === category).length + 1;
  const idFor = (value: number) => `${prefix}-${String(value).padStart(2, "0")}`;
  while (findTemplate(state, idFor(n))) n += 1;
  return idFor(n);
}

/** Copies a template as a fresh v0.1 draft. Returns the copy's id. */
export function duplicateTemplate(state: CommsState, id: string): string | null {
  const source = findTemplate(state, id);
  if (!source) return null;
  const copy: EmailTemplate = structuredClone(source);
  copy.id = nextTemplateId(state, source.category);
  copy.name = `${source.name} (copy)`;
  copy.status = "Draft";
  copy.version = "v0.1";
  copy.updated = DEMO_TODAY;
  copy.created = DEMO_TODAY;
  copy.approval = null;
  copy.versions = [{ version: "v0.1", by: DEMO_ACTOR, date: DEMO_TODAY, note: `Duplicated from ${source.id}`, status: "Draft", changes: [] }];
  copy.blocks.forEach((block) => {
    block.id = newBlockId();
  });
  state.templates.push(copy);
  logAudit(state, `duplicated from ${source.id}`, copy.id, "Draft");
  return copy.id;
}

export function archiveTemplate(state: CommsState, id: string): void {
  const template = findTemplate(state, id);
  if (!template) return;
  template.status = "Archived";
  logAudit(state, "archived", id, "Archived");
}

export function submitForApproval(state: CommsState, id: string): void {
  const template = findTemplate(state, id);
  if (!template) return;
  template.status = "Pending Approval";
  template.approval = {
    by: DEMO_ACTOR,
    at: nowStamp(),
    reviewer: "Priya Raman (Governance Officer)",
    status: "Pending",
    comment: "",
    decided: "",
  };
  if (template.versions[0]) template.versions[0].status = "Pending Approval";
  logAudit(state, `submitted ${template.version} for approval`, id, "Pending");
}

/** Approval only. Publishing stays a separate, deliberate step. */
export function approveTemplate(state: CommsState, id: string, comment: string): void {
  const template = findTemplate(state, id);
  if (!template?.approval) return;
  template.approval.status = "Approved";
  template.approval.decided = nowStamp();
  template.approval.comment = comment || "Approved.";
  template.status = "Approved";
  if (template.versions[0]) template.versions[0].status = "Approved";
  logChange(state, "approved template version", id, "Pending Approval", "Approved", template.approval.comment);
}

/** Points future deliveries at an earlier version. Past delivery records keep the version they used. */
export function rollbackTemplate(state: CommsState, id: string, version: string): void {
  const template = findTemplate(state, id);
  if (!template) return;
  logChange(state, "rolled back template", id, template.live ?? template.version, version, "Rollback for future deliveries only");
  template.live = version;
}

export function rejectTemplate(state: CommsState, id: string, comment: string): void {
  const template = findTemplate(state, id);
  if (!template?.approval) return;
  template.approval.status = "Rejected";
  template.approval.comment = comment;
  template.approval.decided = nowStamp();
  template.status = "Draft";
  if (template.versions[0]) template.versions[0].status = "Rejected";
  logAudit(state, `rejected ${template.version}`, id, "Rejected");
}

export function publishTemplate(state: CommsState, id: string): void {
  const template = findTemplate(state, id);
  if (!template) return;
  template.status = "Published";
  template.updated = DEMO_TODAY;
  if (template.versions[0]) template.versions[0].status = "Published";
  logAudit(state, `published ${template.version}`, id);
}

export interface WizardInput {
  name: string;
  id: string;
  category: CategoryId;
  priority: Priority;
  description: string;
  triggerType: TriggerType;
  event: string;
  subject: string;
  preview: string;
}

export function suggestTemplateId(state: CommsState, category: CategoryId): string {
  return nextTemplateId(state, category);
}

export function createTemplate(state: CommsState, input: WizardInput): void {
  const category = findCategory(input.category);
  if (!category) return;
  const template = buildTemplate(category, 0, input.name);
  Object.assign(template, {
    id: input.id,
    name: input.name,
    description: input.description,
    priority: input.priority,
    triggerType: input.triggerType,
    event: input.event,
    subject: input.subject,
    preview: input.preview,
    status: "Draft",
    version: "v0.1",
    updated: DEMO_TODAY,
    created: DEMO_TODAY,
    approval: null,
    by: DEMO_ACTOR,
    blocks: genericBlocks(input.name, category),
    variables: genericVariables(),
    versions: [{ version: "v0.1", by: DEMO_ACTOR, date: DEMO_TODAY, note: "Created with the template wizard", status: "Draft", changes: [] }],
  } satisfies Partial<EmailTemplate>);
  state.templates.push(template);
  logAudit(state, "created template", template.id, "Draft");
}

/** The next id for a Workspaces or Team row, e.g. WS-06. */
export function nextRowId(rows: ModuleRow[], prefix: string): string {
  const highest = Math.max(0, ...rows.map((r) => Number(r.id.replace(/\D/g, "")) || 0));
  return `${prefix}${String(highest + 1).padStart(2, "0")}`;
}
