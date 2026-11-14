"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { DeskContext } from "@/components/acquisition/DeskContext";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { acquisitionKeys, useDesk } from "@/hooks/useAcquisition";
import { dismissLegacyDesk, importLegacyDesk, legacyDeskInBrowser } from "@/lib/acquisition/storage";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Desk } from "@/types/acquisition";

export default function AcquisitionLayout({ children }: { children: ReactNode }) {
  const { data, isPending, isError, error, refetch } = useDesk();

  return (
    <div>
      <div className="px-7 pt-4 text-2xs uppercase tracking-wider text-ink-faint">Customer acquisition · shared with the whole team</div>
      <LegacyImportBanner />

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

/** The desk used to live in each browser. If this browser still holds one, offer to move it to the shared desk once. */
function LegacyImportBanner() {
  const qc = useQueryClient();
  const [legacy, setLegacy] = useState<{ desk: Partial<Desk>; count: number } | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => setLegacy(legacyDeskInBrowser()), []);
  if (!legacy) return null;

  const run = async () => {
    setPending(true);
    try {
      const r = await importLegacyDesk(legacy.desk);
      toastSuccess(`Imported ${r.imported} record${r.imported === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} already there)` : ""}.`);
      setLegacy(null);
      await qc.invalidateQueries({ queryKey: acquisitionKeys.desk });
    } catch (e) {
      toastError(e, "Couldn't import the desk.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="mx-7 mt-3 flex flex-wrap items-center justify-between gap-3 border-info/40 bg-info-soft px-4 py-3 text-sm">
      <p className="text-ink">
        This browser still holds {legacy.count} desk record{legacy.count === 1 ? "" : "s"} from before the desk moved to the server. Import them so the whole
        team can see them.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => { dismissLegacyDesk(); setLegacy(null); }}>
          Not now
        </Button>
        <Button size="sm" variant="primary" loading={pending} onClick={run}>
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
      </div>
    </Card>
  );
}
