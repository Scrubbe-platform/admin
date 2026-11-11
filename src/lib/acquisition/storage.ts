import { emptyDesk } from "@/lib/acquisition/desk";
import type { Desk, DeskRecord, RecordKind } from "@/types/acquisition";

/** Same key and format as the standalone Acquisition Desk page. */
export const DESK_STORAGE_KEY = "scrubbe-acquisition-desk-offline-v1";

const KINDS: RecordKind[] = ["companies", "contacts", "meetings", "tasks", "notes", "templates"];

function isRecord(value: unknown): value is DeskRecord {
  return typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";
}

/** Fills in any list a stored desk is missing and drops entries without an id. */
function normaliseDesk(raw: unknown): Desk {
  const desk = emptyDesk();
  if (typeof raw !== "object" || raw === null) return desk;

  const stored = raw as Partial<Record<RecordKind, unknown>>;
  const lists = desk as unknown as Record<RecordKind, DeskRecord[]>;
  for (const kind of KINDS) {
    const list = stored[kind];
    if (Array.isArray(list)) lists[kind] = list.filter(isRecord);
  }
  return desk;
}

export function loadDesk(): Desk {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DESK_STORAGE_KEY);
  } catch {
    throw new Error("This browser is blocking site storage, so the desk can't open. Allow site data, then reload.");
  }
  if (!raw) return emptyDesk();

  try {
    return normaliseDesk(JSON.parse(raw));
  } catch {
    throw new Error("The desk saved in this browser couldn't be read.");
  }
}

export function saveDesk(desk: Desk): Desk {
  try {
    window.localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(desk));
  } catch {
    throw new Error("Couldn't save. Check that this browser allows site storage and has space left.");
  }
  return desk;
}
