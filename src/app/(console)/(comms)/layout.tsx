"use client";

import type { ReactNode } from "react";

import { CommsContext } from "@/components/comms/CommsContext";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useCommsState } from "@/hooks/useComms";

/** Shared by the Communications Centre, Organisation, Team & Access and Settings pages. */
export default function CommsLayout({ children }: { children: ReactNode }) {
  const { data, isPending, isError, error, refetch } = useCommsState();

  return (
    <div className="px-7 pb-16 pt-5">
      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : (
        <CommsContext.Provider value={data}>{children}</CommsContext.Provider>
      )}
    </div>
  );
}
