"use client";

import { Check, Copy } from "lucide-react";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { MeetingProviderBadge, StatusBadge } from "@/components/acquisition/DeskParts";
import { Button } from "@/components/ui/primitives";
import { useSaveDesk } from "@/hooks/useAcquisition";
import { findProspect, formatWhen, markFollowUpDone } from "@/lib/acquisition/desk";
import { linkOf } from "@/lib/acquisition/meetingLink";
import { copyText } from "@/lib/clipboard";
import { toastSuccess } from "@/lib/toast";
import type { DeskRecord } from "@/types/acquisition";

export type ItemKind = "contacts" | "meetings" | "tasks" | "notes";

/** One row in any desk list. Lists render these inside a `divide-y divide-line` container. */
export function RecordItem({ kind, record, onEdit }: { kind: ItemKind; record: DeskRecord; onEdit: () => void }) {
  const desk = useDeskData();
  const save = useSaveDesk();

  const company = findProspect(desk, record.company)?.name;
  const detail =
    kind === "contacts" ? [record.role, record.email, record.profile].filter(Boolean).join(" · ") : formatWhen(record.date);
  const meetingLink = kind === "meetings" ? linkOf(record.location) : "";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="break-words text-sm font-medium text-ink">{record.title ?? record.name}</h3>
        <p className="break-words text-xs text-ink-faint">{[company, detail].filter(Boolean).join(" · ")}</p>

        {record.status || meetingLink ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {record.status ? <StatusBadge status={record.status} /> : null}
            {kind === "meetings" ? <MeetingProviderBadge text={record.location} /> : null}
          </div>
        ) : null}

        {kind === "meetings" && record.location ? (
          <p className="break-all text-xs text-ink-muted">{record.location}</p>
        ) : null}
        {record.body ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-muted">{record.body}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {kind === "tasks" && record.status === "Open" ? (
          <Button
            size="sm"
            loading={save.isPending}
            onClick={() =>
              save.mutate(markFollowUpDone(desk, record.id), {
                onSuccess: () => toastSuccess("Follow-up marked done."),
              })
            }
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Mark done
          </Button>
        ) : null}
        {meetingLink ? (
          <Button size="sm" onClick={() => void copyText(meetingLink, "Meeting link copied.")}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copy link
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}
