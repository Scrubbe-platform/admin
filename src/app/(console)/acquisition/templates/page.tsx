"use client";

import { Copy, Plus } from "lucide-react";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { EmptyNote } from "@/components/acquisition/DeskParts";
import { useDeskDialogs } from "@/components/acquisition/useDeskDialogs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui/primitives";
import { copyText } from "@/lib/clipboard";

export default function TemplatesPage() {
  const desk = useDeskData();
  const { openEditor, dialogs } = useDeskDialogs();

  return (
    <div className="pb-16">
      <PageHeader
        title="Email templates"
        description="Edit and copy drafts for outreach, discovery, design partnerships and commercial follow-up."
        actions={
          <Button variant="primary" onClick={() => openEditor("templates")}>
            <Plus className="h-4 w-4" aria-hidden />
            Add template
          </Button>
        }
      />

      <div className="space-y-4 px-7 py-5">
        {desk.templates.length ? (
          desk.templates.map((template) => (
            <Card key={template.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">{template.title}</h2>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() =>
                      void copyText(`Subject: ${template.subject}\n\n${template.body}`, "Template copied.")
                    }
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy email
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEditor("templates", template.id)}>
                    Edit
                  </Button>
                </div>
              </div>
              <p className="mt-3 break-words text-sm font-medium text-ink">{template.subject}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-muted">{template.body}</p>
            </Card>
          ))
        ) : (
          <Card className="p-5">
            <EmptyNote>No templates yet.</EmptyNote>
          </Card>
        )}
      </div>

      {dialogs}
    </div>
  );
}
