"use client";

import { ArrowLeft, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { EmptyNote, Panel } from "@/components/acquisition/DeskParts";
import { RecordItem, type ItemKind } from "@/components/acquisition/RecordItem";
import { useDeskDialogs } from "@/components/acquisition/useDeskDialogs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { findProspect, sortByDate } from "@/lib/acquisition/desk";
import { FIELDS, RECORD_LABELS } from "@/lib/acquisition/fields";
import type { DeskRecord } from "@/types/acquisition";

const SECTIONS: { kind: ItemKind; title: string }[] = [
  { kind: "contacts", title: "Contacts" },
  { kind: "notes", title: "Conversation notes" },
  { kind: "meetings", title: "Meetings" },
  { kind: "tasks", title: "Follow-ups" },
];

const DETAIL_FIELDS = FIELDS.companies.filter((field) => field.key !== "name");

export default function ProspectPage() {
  const params = useParams<{ id: string }>();
  const desk = useDeskData();
  const { openEditor, dialogs } = useDeskDialogs();
  const prospect = findProspect(desk, params.id);

  if (!prospect) {
    return (
      <div className="pb-16">
        <Card className="m-7">
          <EmptyState
            title="That prospect couldn't be found"
            body={<p>It may have been deleted, or the link may be wrong.</p>}
            action={
              <Link href="/acquisition/pipeline">
                <Button size="sm">Back to pipeline</Button>
              </Link>
            }
          />
        </Card>
        {dialogs}
      </div>
    );
  }

  return (
    <div className="pb-16">
      <PageHeader
        title={prospect.name}
        description="Prospect record"
        actions={
          <Link
            href="/acquisition/pipeline"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to pipeline
          </Link>
        }
      />

      <div className="space-y-4 px-7 py-5">
        <Panel
          title="Company & qualification"
          action={
            <Button size="sm" onClick={() => openEditor("companies", prospect.id)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit prospect
            </Button>
          }
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {DETAIL_FIELDS.map((field) => (
              <div key={field.key} className="min-w-0">
                <dt className="text-xs text-ink-faint">{field.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{prospect[field.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map(({ kind, title }) => {
            const list: DeskRecord[] = desk[kind];
            const records = sortByDate(list.filter((record) => record.company === prospect.id));
            // Latest conversation first; everything else reads earliest first.
            if (kind === "notes") records.reverse();

            return (
              <Panel
                key={kind}
                title={title}
                action={
                  <Button size="sm" onClick={() => openEditor(kind, undefined, prospect.id)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add {RECORD_LABELS[kind]}
                  </Button>
                }
              >
                {records.length ? (
                  <div className="divide-y divide-line">
                    {records.map((record) => (
                      <RecordItem key={record.id} kind={kind} record={record} onEdit={() => openEditor(kind, record.id)} />
                    ))}
                  </div>
                ) : (
                  <EmptyNote>No {title.toLowerCase()} yet.</EmptyNote>
                )}
              </Panel>
            );
          })}
        </div>
      </div>

      {dialogs}
    </div>
  );
}
