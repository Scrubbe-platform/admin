"use client";

import type { ReactNode } from "react";

import { DeskContext } from "@/components/acquisition/DeskContext";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useDesk } from "@/hooks/useAcquisition";

export default function AcquisitionLayout({ children }: { children: ReactNode }) {
  const { data, isPending, isError, error, refetch } = useDesk();

  return (
    <div>
      <div className="px-7 pt-4 text-2xs uppercase tracking-wider text-ink-faint">Customer acquisition</div>

      {isPending ? (
        <div className="space-y-4 px-7 py-5">
          <Skeleton className="h-56 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      ) : isError || !data ? (
        <Card className="m-7">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : (
        <DeskContext.Provider value={data}>{children}</DeskContext.Provider>
      )}
    </div>
  );
}
