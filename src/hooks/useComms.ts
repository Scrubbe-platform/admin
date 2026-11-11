"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { seedComms } from "@/lib/comms/seed";
import { loadComms, saveComms } from "@/lib/comms/storage";
import { toastError } from "@/lib/toast";
import type { CommsState } from "@/types/comms";

export const commsKeys = {
  state: ["comms", "state"] as const,
};

/** The demonstration lives in localStorage: it never goes stale, and retrying a failed read won't help. */
export function useCommsState() {
  return useQuery<CommsState>({
    queryKey: commsKeys.state,
    queryFn: async () => loadComms(),
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Applies a recipe to a copy of the latest state, saves it, and publishes it.
 * It reads from the cache rather than a render-time snapshot and runs
 * synchronously, so rapid edits (typing, toggling) never overwrite each other.
 * Returns the recipe's result, or undefined when nothing was saved.
 */
export function useCommsUpdate() {
  const queryClient = useQueryClient();

  return useCallback(
    <T>(recipe: (draft: CommsState) => T): T | undefined => {
      const current = queryClient.getQueryData<CommsState>(commsKeys.state);
      if (!current) return undefined;
      const next = structuredClone(current);
      const result = recipe(next);
      try {
        saveComms(next);
      } catch (error) {
        toastError(error, "Couldn't save.");
        return undefined;
      }
      queryClient.setQueryData(commsKeys.state, next);
      return result;
    },
    [queryClient],
  );
}

/** Replaces everything with freshly seeded demonstration data. */
export function useResetComms() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const seeded = seedComms();
    try {
      saveComms(seeded);
    } catch (error) {
      toastError(error, "Couldn't reset the demonstration data.");
      return false;
    }
    queryClient.setQueryData(commsKeys.state, seeded);
    return true;
  }, [queryClient]);
}
