"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MailCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { CommsContext } from "@/components/comms/CommsContext";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { commsKeys, useCommsLibrary, useCommsSaveStatus } from "@/hooks/useComms";
import { setCommsActor } from "@/lib/comms/catalog";
import { initialiseComms } from "@/lib/comms/storage";
import { toastError, toastSuccess } from "@/lib/toast";
import { displayName } from "@/types/user";

/** The Communications Centre: its library is stored by the Scrubbe API and shared by all staff. */
export default function CommsLayout({ children }: { children: ReactNode }) {
  const { user, can } = useCurrentUser();
  const { data, isPending, isError, error, refetch } = useCommsLibrary();
  const saving = useCommsSaveStatus();
  const qc = useQueryClient();
  const [initialising, setInitialising] = useState(false);

  useEffect(() => {
    if (user) setCommsActor(displayName(user));
  }, [user]);

  const initialise = async () => {
    setInitialising(true);
    try {
      await initialiseComms();
      toastSuccess("Template library set up");
      await qc.invalidateQueries({ queryKey: commsKeys.state });
    } catch (e) {
      toastError(e, "Couldn't set up the library.");
    } finally {
      setInitialising(false);
    }
  };

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
      ) : !data.initialised ? (
        <Card>
          <EmptyState
            icon={<MailCheck className="h-6 w-6" />}
            title="Set up the communications library"
            body="This creates Scrubbe's starting set of email templates, event mappings, policies and design system on the server, where every staff member edits the same copy."
            action={
              can("comms.write") ? (
                <Button variant="primary" loading={initialising} onClick={initialise}>
                  Set up library
                </Button>
              ) : (
                <p className="text-xs text-ink-faint">An editor or administrator needs to do this.</p>
              )
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
            <span>
              Library changes are saved to the server and audited. Scrubbe&apos;s outgoing emails still use the server&apos;s built-in templates until this library is
              connected to sending.
            </span>
            <span className="inline-flex items-center gap-1" aria-live="polite">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </>
              ) : (
                "All changes saved"
              )}
            </span>
          </div>
          <CommsContext.Provider value={data.state}>{children}</CommsContext.Provider>
        </>
      )}
    </div>
  );
}
