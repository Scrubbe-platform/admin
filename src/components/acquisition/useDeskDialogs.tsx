"use client";

import { useState, type ReactNode } from "react";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { MeetingLeadDialog } from "@/components/acquisition/MeetingLeadDialog";
import { RecordDialog, type EditorTarget } from "@/components/acquisition/RecordDialog";
import type { RecordKind } from "@/types/acquisition";

/** Every desk view edits records the same way. Render `dialogs` once in the page. */
export function useDeskDialogs(): {
  openEditor: (kind: RecordKind, id?: string, companyId?: string) => void;
  openMeetingLead: () => void;
  dialogs: ReactNode;
} {
  const desk = useDeskData();
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  function openEditor(kind: RecordKind, id?: string, companyId?: string) {
    // Contacts, meetings, follow-ups and notes are each filed under a prospect.
    const needsProspect = !id && kind !== "companies" && kind !== "templates" && desk.companies.length === 0;
    setEditor(
      needsProspect
        ? { kind: "companies", notice: "Add a prospect first. Contacts, meetings, follow-ups and notes each belong to one." }
        : { kind, id, companyId },
    );
  }

  return {
    openEditor,
    openMeetingLead: () => setLeadOpen(true),
    dialogs: (
      <>
        {editor ? (
          <RecordDialog
            key={`${editor.kind}:${editor.id ?? "new"}:${editor.companyId ?? ""}`}
            target={editor}
            onClose={() => setEditor(null)}
          />
        ) : null}
        {leadOpen ? <MeetingLeadDialog onClose={() => setLeadOpen(false)} /> : null}
      </>
    ),
  };
}
