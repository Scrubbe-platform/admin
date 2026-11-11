"use client";

import { createContext, useContext } from "react";

import type { Desk } from "@/types/acquisition";

export const DeskContext = createContext<Desk | null>(null);

/** The loaded desk. The acquisition layout only renders its pages once the desk has loaded. */
export function useDeskData(): Desk {
  const desk = useContext(DeskContext);
  if (!desk) throw new Error("useDeskData must be used inside the acquisition layout.");
  return desk;
}
