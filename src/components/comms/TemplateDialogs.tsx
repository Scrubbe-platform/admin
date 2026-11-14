"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { ConfirmDialog } from "@/components/comms/parts";
import { Badge, Button, Field, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import {
  archiveTemplate,
  duplicateTemplate,
  findTemplate,
  submitForApproval,
} from "@/lib/comms/operations";
import { renderEmail, sampleValues, substitute, validateTemplate, type ValidationIssue } from "@/lib/comms/render";
import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";
import type { EmailTemplate } from "@/types/comms";

export function ValidationList({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) {
    return (
      <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">
        <b>Passed:</b> required content, variables, links and structure are valid.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {issues.map((issue, i) => (
        <p
          key={i}
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            issue.error ? "bg-danger-soft text-danger" : "bg-caution-soft text-caution",
          )}
        >
          <b>{issue.error ? "Error" : "Warning"}:</b> {issue.message}
        </p>
      ))}
    </div>
  );
}

export function EmailFrame({ html, width, className }: { html: string; width: number; className?: string }) {
  return (
    <iframe
      title="Email preview"
      sandbox=""
      srcDoc={html}
      style={{ width }}
      className={cn("h-[60vh] min-h-[420px] max-w-full rounded border border-line bg-white", className)}
    />
  );
}

export function PreviewModal({ template, width = 640, onClose }: { template: EmailTemplate; width?: number; onClose: () => void }) {
  const { state } = useComms();
  const { html } = renderEmail(template, sampleValues(template), state.design);
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`${template.name} preview`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Badge tone="info">Sample values</Badge>
      <div className="mt-3 flex justify-center">
        <EmailFrame html={html} width={width} />
      </div>
    </Modal>
  );
}

export function TestSendModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const { state } = useComms();
  const { user } = useCurrentUser();
  const [to, setTo] = useState(user?.email ?? "");
  const [sending, setSending] = useState(false);

  // A real send of the rendered template with its sample values. The API only
  // accepts staff addresses, so this can never email a customer.
  const send = async () => {
    const values = sampleValues(template);
    const { html } = renderEmail(template, values, state.design);
    setSending(true);
    try {
      await request({
        method: "POST",
        url: `${ENDPOINTS.comms}/test-send`,
        data: { to: to.trim(), subject: substitute(template.subject, template, values, true), html, templateId: template.id },
      });
      onClose();
      toastSuccess(`Test sent to ${to.trim()}.`);
    } catch (error) {
      toastError(error, "Couldn't send the test.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Test send"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" loading={sending} disabled={!/^\S+@\S+\.\S+$/.test(to)} onClick={send}>
            Send test
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm leading-6 text-ink-muted">
        Sends this template, filled with its sample values, through the live email provider. Tests can only go to Scrubbe staff addresses, and the
        subject is prefixed with [TEST]. The send is recorded in the delivery and audit logs.
      </p>
      <Field label="Recipient (staff address)" htmlFor="test-recipient">
        <Input id="test-recipient" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function SubmitModal({
  template,
  onSubmit,
  onClose,
}: {
  template: EmailTemplate;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const issues = validateTemplate(template);
  const blocked = issues.some((issue) => issue.error);
  return (
    <Modal
      open
      onClose={onClose}
      title={blocked ? "Fix validation errors before submitting" : "Submit for approval"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {blocked ? "Close" : "Cancel"}
          </Button>
          {blocked ? null : (
            <Button variant="primary" onClick={onSubmit}>
              Submit for approval
            </Button>
          )}
        </>
      }
    >
      <ValidationList issues={issues} />
      {blocked ? null : (
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          A reviewer must explicitly approve this version. In production, approval and publication are
          backend-authorised operations.
        </p>
      )}
    </Modal>
  );
}

export type TemplateAction = "preview" | "edit" | "duplicate" | "history" | "test" | "submit" | "archive";

/** Runs the per-template actions offered in tables, menus and the detail page. */
export function useTemplateActions(): { run: (action: TemplateAction, id: string) => void; dialogs: ReactNode } {
  const { state, update } = useComms();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<{ action: "preview" | "test" | "submit" | "archive"; id: string } | null>(null);

  const template = open ? findTemplate(state, open.id) : undefined;
  const close = () => setOpen(null);

  function run(action: TemplateAction, id: string) {
    const target = findTemplate(state, id);
    if (!target) return;
    switch (action) {
      case "edit":
        if (target.status === "Archived") return toastError(null, "Archived templates are read-only.");
        if (target.status === "Pending Approval") {
          return toastError(null, "This template is in review and can't be edited until a decision is made.");
        }
        return router.push(`/communications/templates/${id}/edit`);
      case "duplicate": {
        const copyId = update((draft) => duplicateTemplate(draft, id));
        if (!copyId) return;
        toastSuccess(`Duplicated as ${copyId}.`);
        if (pathname === `/communications/templates/${id}`) router.push(`/communications/templates/${copyId}`);
        return;
      }
      case "history":
        return router.push(`/communications/versions?template=${id}`);
      default:
        setOpen({ action, id });
    }
  }

  let dialogs: ReactNode = null;
  if (open && template) {
    if (open.action === "preview") dialogs = <PreviewModal template={template} onClose={close} />;
    if (open.action === "test") dialogs = <TestSendModal template={template} onClose={close} />;
    if (open.action === "submit") {
      dialogs = (
        <SubmitModal
          template={template}
          onClose={close}
          onSubmit={() => {
            update((draft) => submitForApproval(draft, template.id));
            close();
            toastSuccess("Submitted for approval.");
          }}
        />
      );
    }
    if (open.action === "archive") {
      dialogs = (
        <ConfirmDialog
          title={`Archive ${template.name}?`}
          body="Archived templates stop sending and become read-only. This action is recorded in the audit history."
          confirmLabel="Archive template"
          danger
          onClose={close}
          onConfirm={() => {
            update((draft) => archiveTemplate(draft, template.id));
            close();
            toastSuccess("Template archived.");
          }}
        />
      );
    }
  }

  return { run, dialogs };
}
