import { seedComms } from "@/lib/comms/seed";
import type { CommsState } from "@/types/comms";

/** v2 moved to the internal, multi-tenant model; older v1 demonstration data is left behind. */
export const COMMS_STORAGE_KEY = "scrubbe-comms-centre-v2";

/** Reads the stored demonstration, or seeds a fresh one the first time. */
export function loadComms(): CommsState {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(COMMS_STORAGE_KEY);
  } catch {
    throw new Error("This browser is blocking site storage, so the Communications Centre can't open. Allow site data, then reload.");
  }
  if (raw) {
    try {
      const stored = JSON.parse(raw) as Partial<CommsState> | null;
      // Anything missing a list it needs is treated as unreadable and re-seeded.
      if (
        stored &&
        Array.isArray(stored.templates) &&
        Array.isArray(stored.triggers) &&
        Array.isArray(stored.workspaces) &&
        Array.isArray(stored.policies)
      ) {
        return { ...seedComms(), ...stored } as CommsState;
      }
    } catch {
      // Fall through to a fresh seed.
    }
  }
  const seeded = seedComms();
  saveComms(seeded);
  return seeded;
}

export function saveComms(state: CommsState): void {
  try {
    window.localStorage.setItem(COMMS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error("Couldn't save. Check that this browser allows site storage and has space left.");
  }
}
