"use client";

import { createContext, useContext } from "react";

import { useCommsUpdate } from "@/hooks/useComms";
import type { CommsState } from "@/types/comms";

export const CommsContext = createContext<CommsState | null>(null);

/** The loaded state plus its updater. Only usable under the (comms) layout, which waits for the load. */
export function useComms() {
  const state = useContext(CommsContext);
  const update = useCommsUpdate();
  if (!state) throw new Error("useComms must be used inside the Communications Centre layout.");
  return { state, update };
}
