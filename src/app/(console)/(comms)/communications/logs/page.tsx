"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, KeyValueList, Notice, Pagination, StatusBadge } from "@/components/comms/parts";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { formatTimestamp } from "@/lib/comms/catalog";
import { DELIVERY_STATUSES, deliveryLogs } from "@/lib/comms/logs";
import type { DeliveryLog } from "@/types/comms";

const PAGE_SIZE = 10;

export default function DeliveryLogsPage() {
  const { state } = useComms();
  const [query, setQuery] = useState("");
  const [tenant, setTenant] = useState("All");
  const [status, setStatus] = useState("All");
  const [templateId, setTemplateId] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<DeliveryLog | null>(null);

  const logs = useMemo(() => deliveryLogs(state), [state]);
  const templateIds = useMemo(() => [...new Set(logs.map((log) => log.templateId))].sort(), [logs]);

  const results = logs.filter((log) => {
    const q = query.trim().toLowerCase();
    const day = log.ts.slice(0, 10);
    return (
      (!q ||
        [log.id, log.recipient, log.tenant, log.event, log.templateId, log.correlation, log.eventId]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (tenant === "All" || log.tenant === tenant) &&
      (status === "All" || log.status === status) &&
      (templateId === "All" || log.templateId === templateId) &&
      (!from || day >= from) &&
      (!to || day <= to)
    );
  });

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Any filter change starts from the first page again.
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <div>
      <CommsHeader
        title="Delivery Logs"
        description="Every delivery attempt with its event, use case, policy decision and the exact template version used. Mock records for frontend demonstration."
      />
      <Notice className="mb-4">
        Delivery status describes the email attempt only. It is separate from the policy decision and from whether any
        remediation succeeded.
      </Notice>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => filter(() => setQuery(e.target.value))}
            placeholder="Search ID, recipient, tenant, event, correlation ID"
            aria-label="Search deliveries"
            className="pl-9"
          />
        </div>
        <Select value={tenant} onChange={(e) => filter(() => setTenant(e.target.value))} aria-label="Tenant" className="w-auto">
          {["All", ...state.workspaces.map((w) => w.name ?? w.id)].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => filter(() => setStatus(e.target.value))} aria-label="Status" className="w-auto">
          {["All", ...DELIVERY_STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={templateId}
          onChange={(e) => filter(() => setTemplateId(e.target.value))}
          aria-label="Template"
          className="w-auto"
        >
          {["All", ...templateIds].map((id) => (
            <option key={id}>{id}</option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted">
          From
          <Input type="date" value={from} onChange={(e) => filter(() => setFrom(e.target.value))} className="w-auto" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted">
          To
          <Input type="date" value={to} onChange={(e) => filter(() => setTo(e.target.value))} className="w-auto" />
        </label>
      </div>

      <p className="mb-2 text-sm text-ink-muted" role="status">
        {results.length} deliveries
      </p>

      {results.length ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  {[
                    "Email ID",
                    "Tenant",
                    "Event",
                    "Use case",
                    "Template",
                    "Recipient",
                    "Status",
                    "Policy decision",
                    "Attempts",
                    "Timestamp",
                    "Correlation ID",
                  ].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-2.5 font-normal">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((log) => (
                  <tr key={log.id} onClick={() => setOpen(log)} className="cursor-pointer transition-colors hover:bg-raised/60">
                    <td className="px-3 py-2.5 font-mono text-xs">{log.id}</td>
                    <td className="px-3 py-2.5">{log.tenant}</td>
                    <td className="px-3 py-2.5">
                      <span className="block font-mono text-xs">{log.eventId}</span>
                      <span className="block font-mono text-xs text-ink-faint">{log.event}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted">{log.useCase}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {log.templateId} {log.version}
                    </td>
                    <td className="px-3 py-2.5">{log.recipient}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted">{log.policyDecision}</td>
                    <td className="px-3 py-2.5 tabular-nums">{log.attempts}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{formatTimestamp(log.ts)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{log.correlation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={currentPage} pages={pages} onChange={setPage} />
        </>
      ) : (
        <Card className="px-6 py-10 text-center text-sm text-ink-muted">No deliveries match these filters.</Card>
      )}

      {open ? (
        <Modal
          open
          wide
          onClose={() => setOpen(null)}
          title={open.id}
          footer={
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
          }
        >
          <KeyValueList
            items={[
              ["Tenant", open.tenant],
              ["Event ID", <span key="i" className="font-mono text-xs">{open.eventId}</span>],
              ["Event type", <span key="e" className="font-mono text-xs">{open.event}</span>],
              ["Use case", open.useCase],
              ["Template version used", <span key="t" className="font-mono text-xs">{`${open.templateId} ${open.version}`}</span>],
              ["Recipient", open.recipient],
              ["Policy decision", open.policyDecision],
              ["Delivery status", <StatusBadge key="s" status={open.status} />],
              [
                "Provider response",
                <span key="r" className="font-mono text-xs">
                  {open.status === "Delivered" ? "250 2.0.0 OK (mock)" : open.reason || "202 Accepted (mock)"}
                </span>,
              ],
              ["Failure reason", open.reason || "None"],
              ["Correlation ID", <span key="c" className="font-mono text-xs">{open.correlation}</span>],
              ["Attempts", String(open.attempts)],
            ]}
          />
          <Notice className="mt-4">
            Delivery status is separate from the policy decision and from remediation outcome. Historical records keep the
            template version used at the time.
          </Notice>
        </Modal>
      ) : null}
    </div>
  );
}
