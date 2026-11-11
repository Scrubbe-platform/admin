"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { TemplateEditor } from "@/components/comms/TemplateEditor";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { createDraftVersion, findTemplate } from "@/lib/comms/operations";
import { toastSuccess } from "@/lib/toast";

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const { state, update } = useComms();
  const template = findTemplate(state, params.id);

  // Published versions are immutable: opening one in the editor starts a new draft.
  // The recipe re-checks the stored status, so running twice creates only one draft.
  useEffect(() => {
    const message = update((draft) => createDraftVersion(draft, params.id));
    if (message) toastSuccess(message);
  }, [params.id, update]);

  if (!template) {
    return (
      <Card>
        <EmptyState
          title="Template not found"
          body="It may have been removed, or the link may be wrong."
          action={
            <Link href="/communications/templates">
              <Button size="sm">Back to Email Templates</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  if (template.status === "Archived" || template.status === "Pending Approval") {
    return (
      <Card>
        <EmptyState
          title={template.status === "Archived" ? "Archived templates are read-only" : "This template is in review"}
          body={
            template.status === "Archived"
              ? "Duplicate it to start a new draft from its content."
              : "It can't be edited until a reviewer approves or rejects it."
          }
          action={
            <Link href={`/communications/templates/${template.id}`}>
              <Button size="sm">Back to template</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  if (template.status !== "Draft") {
    return <Skeleton className="h-[560px] w-full" />;
  }

  return <TemplateEditor key={template.id} initial={template} />;
}
