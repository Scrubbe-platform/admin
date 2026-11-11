"use client";

import Link from "next/link";
import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CreateTemplateWizard } from "@/components/comms/CreateTemplateWizard";
import { NotificationFlow } from "@/components/comms/NotificationFlow";
import { CommsHeader, ListCard, Notice, StatusBadge, TemplateLink } from "@/components/comms/parts";
import { PreviewModal } from "@/components/comms/TemplateDialogs";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { CATEGORIES, formatTimestamp } from "@/lib/comms/catalog";
import { deliveryLogs } from "@/lib/comms/logs";
import { findTemplate } from "@/lib/comms/operations";
import type { EmailTemplate } from "@/types/comms";

function counts(templates: EmailTemplate[], category?: string) {
  const list = category ? templates.filter((t) => t.category === category) : templates;
  return {
    total: list.length,
    published: list.filter((t) => t.status === "Published").length,
    draft: list.filter((t) => t.status === "Draft").length,
  };
}

export default function CommunicationsOverviewPage() {
  const { state } = useComms();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const all = counts(state.templates);
  const recent = [...state.templates].sort((a, b) => b.updated.localeCompare(a.updated));
  const pending = state.templates.filter((t) => t.status === "Pending Approval");
  const failed = deliveryLogs(state).filter((log) => log.status === "Failed" || log.status === "Bounced");
  const incidentTemplate = findTemplate(state, "INC-02") ?? state.templates[0];

  const metrics: [string, string | number][] = [
    ["Total templates", all.total],
    ["Published", all.published],
    ["Draft", all.draft],
    ["Pending approval", pending.length],
    ["Emails sent (30 days)", "48,215*"],
    ["Delivery success rate", "98.6%*"],
  ];

  return (
    <div>
      <CommsHeader
        title="Communications Centre"
        description="Manage the notifications, templates and communication workflows that keep your organisation informed across Scrubbe."
        actions={
          <>
            <Button variant="primary" onClick={() => setWizardOpen(true)}>
              Create Template
            </Button>
            {incidentTemplate ? <Button onClick={() => setPreviewing(true)}>Preview Email</Button> : null}
            <Link href="/communications/provider">
              <Button>Configure Email</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
            <p className="text-xs text-ink-muted">{label}</p>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">* Demonstration figures, not live production data.</p>

      <h2 className="mb-3 mt-6 text-base font-semibold text-ink">How notifications flow</h2>
      <NotificationFlow />
      <div className="grid gap-4 lg:grid-cols-2">
        <CapabilityCard
          title="Communications Centre"
          items={[
            ["Create and manage master email templates.", "/communications/templates"],
            ["Configure event-to-template mappings.", "/communications/event-mapping"],
            ["Manage template versions.", "/communications/versions"],
            ["Approve and publish templates.", "/communications/versions"],
            ["Monitor delivery.", "/communications/logs"],
            ["Configure global communication policies.", "/communications/policies"],
          ]}
        />
        <CapabilityCard
          title="Tenant communication settings"
          items={[
            "Configure recipients and notification preferences.",
            "Assign notification responsibilities.",
            "Configure escalation contacts.",
            "Select permitted notification categories.",
            "Configure approved organisation branding, where supported.",
            "Manage tenant-specific notification policies within platform limits.",
          ].map((label): [string, string] => [label, "/communications/tenants"])}
        />
      </div>
      <Notice className="mt-4">
        Master templates, policies and provider settings are controlled centrally by Scrubbe. Tenants cannot create or edit
        templates, change global policies or manage provider credentials. One approved master template renders
        tenant-specific content from event payload and tenant profile.
      </Notice>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Recently edited"
          items={recent.slice(0, 4).map((t) => ({
            key: t.id,
            start: <TemplateLink template={t} />,
            end: <span className="shrink-0 text-xs text-ink-faint">{t.updated}</span>,
          }))}
        />
        <ListCard
          title="Recently published"
          items={recent
            .filter((t) => t.status === "Published")
            .slice(0, 4)
            .map((t) => ({ key: t.id, start: <TemplateLink template={t} />, end: <StatusBadge status="Published" /> }))}
        />
        <ListCard
          title="Pending approval"
          items={pending
            .slice(0, 4)
            .map((t) => ({ key: t.id, start: <TemplateLink template={t} />, end: <StatusBadge status="Pending Approval" /> }))}
        />
        <ListCard
          title="Recently failed deliveries"
          items={failed.slice(0, 4).map((log) => ({
            key: log.id,
            start: (
              <span className="min-w-0 truncate">
                <span className="font-mono text-xs">{log.templateId}</span> {log.recipient}
              </span>
            ),
            end: <StatusBadge status={log.status} />,
          }))}
        />
      </div>

      <h2 className="mb-3 mt-7 text-base font-semibold text-ink">Categories</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((category) => {
          const n = counts(state.templates, category.id);
          return (
            <Card key={category.id} className="flex flex-col p-4">
              <Badge className="w-fit font-mono">{category.prefix}</Badge>
              <h3 className="mt-2 text-sm font-semibold text-ink">{category.name}</h3>
              <p className="mt-0.5 flex-1 text-sm text-ink-muted">{category.description}</p>
              <p className="mt-3 text-xs text-ink-faint">
                {n.total} templates | {n.published} published | {n.draft} draft
              </p>
              <Link
                href={`/communications/categories/${category.id}`}
                className="mt-2 text-sm text-signal-strong hover:underline"
              >
                Open {category.name}
              </Link>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-7 text-base font-semibold text-ink">Recent activity</h2>
      <Card className="divide-y divide-line px-4">
        {state.audit.slice(0, 8).map((entry, i) => (
          <div key={`${entry.ts}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <b className="font-medium text-ink">{entry.actor}</b> <span className="text-ink-muted">{entry.action}</span>{" "}
              {entry.resource ? <TemplateLink template={findTemplate(state, entry.resource)} id={entry.resource} /> : null}
            </span>
            <span className="flex items-center gap-2 text-xs text-ink-faint">
              <StatusBadge status={entry.status} />
              {formatTimestamp(entry.ts)}
            </span>
          </div>
        ))}
      </Card>

      {wizardOpen ? <CreateTemplateWizard onClose={() => setWizardOpen(false)} /> : null}
      {previewing && incidentTemplate ? (
        <PreviewModal template={incidentTemplate} onClose={() => setPreviewing(false)} />
      ) : null}
    </div>
  );
}

function CapabilityCard({ title, items }: { title: string; items: [label: string, href: string][] }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map(([label, href]) => (
          <li key={label} className="py-2">
            <Link href={href} className="text-sm text-signal-strong hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
