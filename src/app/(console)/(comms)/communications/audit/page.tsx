"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, KeyValueList, Notice, StatusBadge } from "@/components/comms/parts";
import { Button, Card, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { AUDIT_OUTCOMES, auditCsv, auditRows, type AuditRow } from "@/lib/comms/audit";

const COLUMNS: [keyof AuditRow, string, boolean?][] = [
  ["id", "Event", true],
  ["time", "Time"],
  ["actor", "Actor"],
  ["action", "Action"],
  ["resource", "Resource", true],
  ["previous", "Previous value"],
  ["next", "New value"],
  ["reason", "Reason"],
  ["correlation", "Correlation ID", true],
];

export default function AuditLogPage() {
  const { state } = useComms();
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("All");
  const [open, setOpen] = useState<AuditRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => auditRows(state), [state]);
  const shown = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    return (!q || Object.values(row).join(" ").toLowerCase().includes(q)) && (outcome === "All" || row.outcome === outcome);
  });

  return (
    <div>
      <CommsHeader
        title="Audit Log"
        description="Read-only record of administrative actions in the Communications Centre. Auditors can inspect records but not change them."
        actions={<Button onClick={() => setExporting(true)}>Export CSV</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="pl-9"
          />
        </div>
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Filter by outcome" className="w-auto">
          {["All", ...AUDIT_OUTCOMES].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </div>

      <p className="mb-2 text-sm text-ink-muted" role="status">
        {shown.length} result{shown.length === 1 ? "" : "s"}
      </p>

      {shown.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                {COLUMNS.map(([key, label]) => (
                  <th key={key} className="whitespace-nowrap px-3 py-2.5 font-normal">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((row) => (
                <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer transition-colors hover:bg-raised/60">
                  {COLUMNS.map(([key, , mono]) => (
                    <td key={key} className={mono ? "px-3 py-2.5 font-mono text-xs" : "px-3 py-2.5 text-ink"}>
                      {row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="px-6 py-10 text-center text-sm text-ink-muted">Nothing matches. Clear the search or filter.</Card>
      )}

      {open ? (
        <Modal
          open
          wide
          onClose={() => setOpen(null)}
          title={open.action}
          footer={
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
          }
        >
          <KeyValueList
            items={[
              ...COLUMNS.map(([key, label]): [string, string] => [label, open[key]]),
              ["Outcome", <StatusBadge key="o" status={open.outcome} />],
            ]}
          />
          <Notice className="mt-4">Audit records are read-only. In production they are written by backend services.</Notice>
        </Modal>
      ) : null}

      {exporting ? (
        <Modal
          open
          wide
          onClose={() => setExporting(false)}
          title="Export audit log (CSV)"
          footer={
            <Button variant="ghost" onClick={() => setExporting(false)}>
              Close
            </Button>
          }
        >
          <p className="mb-3 text-sm text-ink-muted">
            Copy the data below. Scheduled and signed exports require backend integration.
          </p>
          <Textarea readOnly rows={12} value={auditCsv(rows)} className="font-mono text-xs" />
        </Modal>
      ) : null}
    </div>
  );
}
