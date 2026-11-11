"use client";

import { Plus } from "lucide-react";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { EmptyNote } from "@/components/acquisition/DeskParts";
import { RecordItem } from "@/components/acquisition/RecordItem";
import { useDeskDialogs } from "@/components/acquisition/useDeskDialogs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui/primitives";
import { sortByDate } from "@/lib/acquisition/desk";
import { RECORD_LABELS } from "@/lib/acquisition/fields";
import type { DeskRecord } from "@/types/acquisition";

/** The Contacts, Meetings and Follow-ups views: every record of one kind, earliest first. */
export function RecordListPage({
  kind,
  title,
  description,
}: {
  kind: "contacts" | "meetings" | "tasks";
  title: string;
  description: string;
}) {
  const desk = useDeskData();
  const { openEditor, openMeetingLead, dialogs } = useDeskDialogs();
  const list: DeskRecord[] = desk[kind];
  const records = sortByDate(list);

  return (
    <div className="pb-16">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {kind === "meetings" ? (
              <Button onClick={openMeetingLead}>
                <Plus className="h-4 w-4" aria-hidden />
                New meeting lead
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => openEditor(kind)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add {RECORD_LABELS[kind]}
            </Button>
          </div>
        }
      />

      <div className="px-7 py-5">
        <Card className="p-5">
          {records.length ? (
            <div className="divide-y divide-line">
              {records.map((record) => (
                <RecordItem key={record.id} kind={kind} record={record} onEdit={() => openEditor(kind, record.id)} />
              ))}
            </div>
          ) : (
            <EmptyNote>No {title.toLowerCase()} recorded yet.</EmptyNote>
          )}
        </Card>
      </div>

      {dialogs}
    </div>
  );
}
