"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadDesk, saveDesk } from "@/lib/acquisition/storage";
import { toastError } from "@/lib/toast";
import type { Desk } from "@/types/acquisition";

export const acquisitionKeys = {
  desk: ["acquisition", "desk"] as const,
};

/** The shared desk, stored by the Scrubbe API. */
export function useDesk() {
  return useQuery<Desk>({
    queryKey: acquisitionKeys.desk,
    queryFn: loadDesk,
    staleTime: 30_000,
  });
}

/** Saves a whole desk, built by one of the pure helpers in lib/acquisition/desk.ts. */
export function useSaveDesk() {
  const queryClient = useQueryClient();

  return useMutation<Desk, unknown, Desk>({
    mutationFn: async (next) => saveDesk(queryClient.getQueryData<Desk>(acquisitionKeys.desk), next),
    onSuccess: (saved) => queryClient.setQueryData(acquisitionKeys.desk, saved),
    onError: async (error) => {
      toastError(error, "Couldn't save.");
      // Part of a multi-record change may have landed; show what the server actually has.
      await queryClient.invalidateQueries({ queryKey: acquisitionKeys.desk });
    },
  });
}
