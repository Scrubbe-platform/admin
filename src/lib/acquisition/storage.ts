import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { STARTER_TEMPLATES } from "@/lib/acquisition/desk";
import type { Desk, DeskRecord, RecordKind } from "@/types/acquisition";

/**
 * The acquisition desk is stored by the Scrubbe API (/admin/acquisition), so
 * every staff member sees the same desk on every device. The desk UI still
 * builds whole new desks with the pure helpers in desk.ts; `saveDesk` turns
 * the difference between the old and new desk into record-level writes.
 */

const KINDS: RecordKind[] = ["companies", "contacts", "meetings", "tasks", "notes", "templates"];

/** Where the pre-server desk lived in each browser. Only read, to offer a one-time import. */
export const LEGACY_DESK_STORAGE_KEY = "scrubbe-acquisition-desk-offline-v1";
const LEGACY_IMPORTED_FLAG = "scrubbe-acquisition-desk-imported-v1";

/** Starter templates are suggestions shown until the team saves templates of its own. */
const isStarter = (id: string) => id.startsWith("starter-");
const SERVER_ONLY_FIELDS = new Set(["createdAt", "updatedAt"]);

export async function loadDesk(): Promise<Desk> {
  const desk = await request<Desk>({ method: "GET", url: ENDPOINTS.acquisition });
  if (desk.templates.length === 0) desk.templates = STARTER_TEMPLATES.map((t) => ({ ...t }));
  return desk;
}

function payload(record: DeskRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (k === "id" || SERVER_ONLY_FIELDS.has(k) || typeof v !== "string") continue;
    out[k] = v;
  }
  return out;
}

const same = (a: DeskRecord, b: DeskRecord) => JSON.stringify(payload(a)) === JSON.stringify(payload(b));

/** Applies `next` on the server relative to `previous`, then returns the server's desk. */
export async function saveDesk(previous: Desk | undefined, next: Desk): Promise<Desk> {
  // A record's `company` holds its prospect's id. A prospect created in this
  // same save only gets its real id from the server, so links to its
  // temporary id are rewritten as the prospect is created (companies go first).
  const createdIds = new Map<string, string>();
  const link = (record: DeskRecord): DeskRecord =>
    record.company && createdIds.has(record.company) ? { ...record, company: createdIds.get(record.company)! } : record;

  for (const kind of KINDS) {
    const before = new Map(((previous?.[kind] ?? []) as DeskRecord[]).map((r) => [r.id, r]));
    const after = next[kind] as DeskRecord[];
    const kept = new Set<string>();

    for (const raw of after) {
      kept.add(raw.id);
      const record = link(raw);
      const old = before.get(raw.id);
      // New records, and starter templates being saved for the first time, are created.
      if (!old || isStarter(raw.id)) {
        if (old && isStarter(raw.id) && same(old, record)) continue;
        const created = await request<{ id: string }>({ method: "POST", url: `${ENDPOINTS.acquisition}/${kind}`, data: payload(record) });
        if (created?.id) createdIds.set(raw.id, created.id);
      } else if (!same(old, record)) {
        await request({ method: "PUT", url: `${ENDPOINTS.acquisition}/${kind}/${raw.id}`, data: payload(record) });
      }
    }
    for (const id of before.keys()) {
      if (!kept.has(id) && !isStarter(id)) {
        await request({ method: "DELETE", url: `${ENDPOINTS.acquisition}/${kind}/${id}` });
      }
    }
  }
  return loadDesk();
}

// ── One-time import of a desk kept in this browser before it moved to the server ──

export function legacyDeskInBrowser(): { desk: Partial<Desk>; count: number } | null {
  try {
    if (window.localStorage.getItem(LEGACY_IMPORTED_FLAG)) return null;
    const raw = window.localStorage.getItem(LEGACY_DESK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Desk>;
    const desk: Partial<Desk> = {};
    let count = 0;
    for (const kind of KINDS) {
      const list = Array.isArray(parsed[kind]) ? (parsed[kind] as DeskRecord[]).filter((r) => r && typeof r.id === "string" && !isStarter(r.id)) : [];
      (desk as Record<RecordKind, DeskRecord[]>)[kind] = list;
      count += list.length;
    }
    return count > 0 ? { desk, count } : null;
  } catch {
    return null;
  }
}

export async function importLegacyDesk(desk: Partial<Desk>): Promise<{ imported: number; skipped: number }> {
  const result = await request<{ imported: number; skipped: number }>({ method: "POST", url: `${ENDPOINTS.acquisition}/import`, data: { desk } });
  try {
    window.localStorage.setItem(LEGACY_IMPORTED_FLAG, new Date().toISOString());
  } catch {
    // The server de-duplicates repeat imports anyway.
  }
  return result;
}

export function dismissLegacyDesk(): void {
  try {
    window.localStorage.setItem(LEGACY_IMPORTED_FLAG, "dismissed");
  } catch {
    // Nothing to do; the banner will simply show again.
  }
}
