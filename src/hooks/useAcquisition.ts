"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadDesk, saveDesk } from "@/lib/acquisition/storage";
import { toastError } from "@/lib/toast";
import type { Desk } from "@/types/acquisition";

export const acquisitionKeys = {
  desk: ["acquisition", "desk"] as const,
};

/** The desk lives in localStorage: it never goes stale, and retrying a failed read won't help. */
export function useDesk() {
  return useQuery<Desk>({
    queryKey: acquisitionKeys.desk,
    queryFn: async () => loadDesk(),
    staleTime: Infinity,
    retry: false,
  });
}

/** Saves a whole desk, built by one of the pure helpers in lib/acquisition/desk.ts. */
export function useSaveDesk() {
  const queryClient = useQueryClient();

  return useMutation<Desk, unknown, Desk>({
    mutationFn: async (next) => saveDesk(next),
    onSuccess: (saved) => queryClient.setQueryData(acquisitionKeys.desk, saved),
    onError: (error) => toastError(error, "Couldn't save."),
  });
}
