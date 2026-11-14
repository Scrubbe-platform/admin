"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import { COMMS_SECTIONS, loadComms, saveSection, type CommsSection, type LoadedComms } from "@/lib/comms/storage";
import { toastError } from "@/lib/toast";
import type { AuditEntry, CommsState } from "@/types/comms";
import { ApiError } from "@/types/api";

export const commsKeys = {
  state: ["comms", "state"] as const,
};

/** Section versions as last confirmed by the server, used for optimistic concurrency. */
const versions: Partial<Record<CommsSection, number>> = {};

export function useCommsLibrary() {
  return useQuery<LoadedComms>({
    queryKey: commsKeys.state,
    queryFn: async () => {
      const loaded = await loadComms();
      Object.assign(versions, loaded.versions);
      return loaded;
    },
    staleTime: 60_000,
  });
}

// ── Save queue: one request in flight per section; edits made meanwhile are coalesced ──

interface Pending {
  value: unknown;
  audit: AuditEntry[];
}
const pending = new Map<CommsSection, Pending>();
const inFlight = new Set<CommsSection>();
const timers = new Map<CommsSection, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
let saving = 0;
const emit = () => listeners.forEach((l) => l());

/** "saving" while any section has an unsaved or in-flight change. */
export function useCommsSaveStatus(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => saving > 0 || pending.size > 0,
    () => false,
  );
}

async function flush(section: CommsSection, queryClient: QueryClient) {
  if (inFlight.has(section)) return;
  const job = pending.get(section);
  if (!job) return;
  pending.delete(section);
  inFlight.add(section);
  saving += 1;
  emit();
  try {
    const result = await saveSection(section, job.value, versions[section] ?? 0, job.audit);
    versions[section] = result.version;
  } catch (error) {
    pending.delete(section);
    if (error instanceof ApiError && error.status === 409) {
      toastError(error, "Someone else changed this. Reloading their version.");
    } else {
      toastError(error, "Couldn't save your change. Reloading the saved version.");
    }
    await queryClient.invalidateQueries({ queryKey: commsKeys.state });
  } finally {
    inFlight.delete(section);
    saving -= 1;
    emit();
    if (pending.has(section)) void flush(section, queryClient);
  }
}

function schedule(section: CommsSection, value: unknown, audit: AuditEntry[], queryClient: QueryClient) {
  const previous = pending.get(section);
  pending.set(section, { value, audit: [...audit, ...(previous?.audit ?? [])] });
  emit();
  const t = timers.get(section);
  if (t) clearTimeout(t);
  timers.set(
    section,
    setTimeout(() => {
      timers.delete(section);
      void flush(section, queryClient);
    }, 500),
  );
}

/**
 * Applies a recipe to a copy of the latest state and shows it at once, then
 * saves only the sections that changed. Reads from the cache rather than a
 * render-time snapshot, so rapid edits never overwrite each other.
 */
export function useCommsUpdate() {
  const queryClient = useQueryClient();

  return useCallback(
    <T,>(recipe: (draft: CommsState) => T): T | undefined => {
      const current = queryClient.getQueryData<LoadedComms>(commsKeys.state);
      if (!current) return undefined;
      const next = structuredClone(current.state);
      const result = recipe(next);

      // Entries the recipe logged (operations.ts prepends them).
      const added = Math.max(0, next.audit.length - current.state.audit.length);
      const newAudit = next.audit.slice(0, added);

      const changed = COMMS_SECTIONS.filter((s) => JSON.stringify(next[s]) !== JSON.stringify(current.state[s]));
      changed.forEach((s, i) => schedule(s, next[s], i === 0 ? newAudit : [], queryClient));

      queryClient.setQueryData<LoadedComms>(commsKeys.state, { ...current, state: next });
      return result;
    },
    [queryClient],
  );
}
