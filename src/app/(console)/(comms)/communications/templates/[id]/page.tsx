"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, KeyValueList, Notice, StatusBadge } from "@/components/comms/parts";
import { useTemplateActions } from "@/components/comms/TemplateDialogs";
import { VersionTable } from "@/components/comms/VersionTable";
import { Button, Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { categoryName, formatTimestamp, isHighRisk, templateClassification } from "@/lib/comms/catalog";
import { findTemplate } from "@/lib/comms/operations";
import { cn } from "@/lib/cn";

const TABS = ["Overview", "Content", "Variables", "Trigger Configuration", "Version History", "Audit History"] as const;
type Tab = (typeof TABS)[number];

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useComms();
  const { run, dialogs } = useTemplateActions();
  const [tab, setTab] = useState<Tab>("Overview");
  const template = findTemplate(state, params.id);

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

  const mappings = state.triggers.filter((t) => t.templateId === template.id);
  const events = [...new Set([template.event, ...mappings.map((t) => t.event)])];
  const classification = templateClassification(template);
  const approvalStatus = template.approval?.status ?? (template.status === "Published" ? "Approved" : "Not submitted");
  // Demonstration figures, derived from the id so they stay stable between visits.
  const seed = ((template.id.length * 31 + (Number(template.id.replace(/\D/g, "")) || 0) * 17) % 900) + 100;

  const panels: Record<Tab, ReactNode> = {
    Overview: (
      <Card className="p-5">
        <KeyValueList
          items={[
            ["Purpose", template.description],
            ["Status", <StatusBadge key="s" status={template.status} />],
            ["Associated events", <span key="e" className="font-mono text-xs">{events.join(", ")}</span>],
            ["Notification use cases", mappings.length ? mappings.map((t) => t.useCase).join("; ") : "Not yet mapped"],
            [
              "Classification",
              <span key="c" className="flex flex-wrap items-center gap-2">
                <StatusBadge status={classification} />
                {isHighRisk(template) ? (
                  <span className="text-xs text-ink-faint">High-risk: author and approver must differ</span>
                ) : null}
              </span>,
            ],
            ["Author", template.by],
            ["Approval status", <StatusBadge key="a" status={approvalStatus} />],
            [
              "Live version",
              <span key="l">
                <span className="font-mono text-xs">{template.live ?? template.version}</span>{" "}
                <span className="text-ink-faint">(used for future deliveries)</span>
              </span>,
            ],
            [
              "Delivery statistics",
              `${seed * 40} sent, ${97 + (seed % 3)}.${seed % 10}% delivered (30 days, demonstration data)`,
            ],
            ["Recipient audience", template.audience],
            ["Delivery channel", "Email (via configured provider)"],
            ["Version", <span key="v" className="font-mono text-xs">{template.version}</span>],
            ["Ownership", template.owner],
          ]}
        />
      </Card>
    ),
    Content: (
      <Card className="p-5">
        <KeyValueList
          items={[
            ["Subject", <span key="s" className="font-mono text-xs">{template.subject}</span>],
            ["Preview text", template.preview],
            ["Layout", `Single column, ${state.design.width}px`],
          ]}
        />
        <h3 className="mb-1 mt-5 text-sm font-semibold text-ink">Content blocks</h3>
        <div className="divide-y divide-line">
          {template.blocks.map((block, i) => (
            <div key={block.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {i + 1}. {block.name}{" "}
                <span className="text-ink-faint">
                  ({block.type}
                  {block.required ? ", required" : ""})
                </span>
              </span>
              <StatusBadge status={block.visible ? "Enabled" : "Disabled"} />
            </div>
          ))}
        </div>
      </Card>
    ),
    Variables: (
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              {["Variable", "Type", "Required", "Description", "Sample", "Fallback"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {template.variables.map((v) => (
              <tr key={v.key}>
                <td className="px-3 py-2.5 font-mono text-xs">{`{{${v.key}}}`}</td>
                <td className="px-3 py-2.5">{v.type}</td>
                <td className="px-3 py-2.5">{v.required ? "Required" : "Optional"}</td>
                <td className="px-3 py-2.5 text-ink-muted">{v.description}</td>
                <td className="px-3 py-2.5">{v.example}</td>
                <td className="px-3 py-2.5">{v.fallback || <span className="text-ink-faint">Hide / none</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    ),
    "Trigger Configuration": (
      <Card className="p-5">
        <KeyValueList
          items={[
            ["Event", <span key="e" className="font-mono text-xs">{template.event}</span>],
            ["Trigger type", template.triggerType],
            ["Conditions", <span key="c" className="font-mono text-xs">{template.condition || "None"}</span>],
            ["Priority", <StatusBadge key="p" status={template.priority} />],
            ["Recipient resolution", template.recipientRule],
          ]}
        />
        <Notice className="mt-4">
          Recipient resolution and policy checks are enforced by backend services. This configuration cannot bypass them.
        </Notice>
        <Link href="/communications/event-mapping" className="mt-3 inline-block">
          <Button size="sm">Open Event Mapping</Button>
        </Link>
      </Card>
    ),
    "Version History": (
      <VersionTable
        template={template}
        onCompare={(i) => router.push(`/communications/versions?template=${template.id}&compare=${i}`)}
      />
    ),
    "Audit History": (
      <Card className="divide-y divide-line px-4">
        {state.audit.filter((entry) => entry.resource === template.id).length ? (
          state.audit
            .filter((entry) => entry.resource === template.id)
            .map((entry, i) => (
              <div key={`${entry.ts}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <b className="font-medium">{entry.actor}</b> <span className="text-ink-muted">{entry.action}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-ink-faint">
                  <StatusBadge status={entry.status} />
                  {formatTimestamp(entry.ts)}
                </span>
              </div>
            ))
        ) : (
          <p className="py-3 text-sm text-ink-faint">No administrative actions recorded.</p>
        )}
      </Card>
    ),
  };

  return (
    <div>
      <Link
        href="/communications/templates"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Email Templates
      </Link>

      <CommsHeader
        title={template.name}
        description={
          <>
            <span className="font-mono text-xs">{template.id}</span> | {categoryName(template.category)} | {template.description}
          </>
        }
        actions={
          <>
            <Button variant="primary" onClick={() => run("edit", template.id)}>
              Edit Template
            </Button>
            <Button onClick={() => run("preview", template.id)}>Preview</Button>
            <Button onClick={() => run("test", template.id)}>Test Send</Button>
            <Button onClick={() => run("submit", template.id)} disabled={template.status !== "Draft"}>
              Submit for Approval
            </Button>
            <Button onClick={() => run("history", template.id)}>View History</Button>
          </>
        }
      />

      <p className="-mt-2 mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <StatusBadge status={template.status} />
        <span className="font-mono text-xs">{template.version}</span> | Modified {template.updated} by {template.by} | Created{" "}
        {template.created}
      </p>

      <div role="tablist" className="mb-4 flex gap-0.5 overflow-x-auto border-b border-line">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              tab === name ? "border-signal font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {panels[tab]}
      {dialogs}
    </div>
  );
}
