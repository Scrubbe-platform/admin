"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, money, PageBody, Pager, Section, StatCard, StatusBadge, Toolbar, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Skeleton } from "@/components/ui/primitives";
import { fetchBillingOverview, fetchStaffInvoices, type StaffInvoice } from "@/lib/api/staff";

const COLUMNS: Column<StaffInvoice>[] = [
  { key: "ref", header: "Invoice", render: (i) => <span className="font-mono text-xs">{i.reference}</span> },
  { key: "ws", header: "Workspace", render: (i) => (i.workspace ? <Link href={`/workspaces/${i.workspace.id}`} className="text-signal-strong hover:underline">{i.workspace.name}</Link> : "—") },
  { key: "amount", header: "Amount", render: (i) => <span className="tabular-nums">{money(i.amount, i.currency)}</span>, className: "text-right" },
  { key: "balance", header: "Balance", render: (i) => <span className="tabular-nums">{i.storedStatus === "VOID" ? "—" : money(i.balanceDue, i.currency)}</span>, className: "text-right" },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "due", header: "Due", render: (i) => <span className="text-ink-muted">{formatDate(i.dueDate)}</span> },
];

export default function BillingPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const overview = useQuery({ queryKey: ["billing-overview"], queryFn: fetchBillingOverview });
  const invoices = useQuery({ queryKey: ["staff-invoices", status, page], queryFn: () => fetchStaffInvoices({ status, page, limit: 25 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader
        title="Billing"
        description="Enterprise commercials across all workspaces. Create agreements, quotations and invoices from a workspace's Commercial tab."
      />
      <PageBody>
        {!overview.data ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {overview.data.receivables.length === 0 ? (
              <StatCard label="Outstanding" value="—" hint="No issued, unpaid invoices" />
            ) : (
              overview.data.receivables.map((r) => (
                <StatCard
                  key={r.currency}
                  label={`Outstanding (${r.currency})`}
                  value={money(r.outstanding, r.currency)}
                  hint={r.overdueCount ? `${money(r.overdue, r.currency)} overdue on ${r.overdueCount}` : "Nothing overdue"}
                  tone={r.overdueCount ? "danger" : undefined}
                />
              ))
            )}
            <StatCard label="Paid invoices" value={overview.data.invoiceCounts.PAID ?? 0} />
            <StatCard label="Draft invoices" value={overview.data.invoiceCounts.DRAFT ?? 0} hint="Not visible to customers" />
          </div>
        )}

        <Card>
          <Toolbar>
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "", label: "All" },
                { value: "OVERDUE", label: "Overdue" },
                { value: "ISSUED", label: "Issued" },
                { value: "PART_PAID", label: "Part paid" },
                { value: "PAID", label: "Paid" },
                { value: "DRAFT", label: "Draft" },
                { value: "VOID", label: "Void" },
              ]}
            />
          </Toolbar>
          <DataTable
            columns={COLUMNS}
            rows={invoices.data?.items}
            isLoading={invoices.isLoading}
            error={invoices.error}
            onRetry={() => invoices.refetch()}
            empty={{ title: "No invoices", body: "Open a workspace and use its Commercial tab to raise one." }}
          />
          {invoices.data ? <Pager page={invoices.data.page} limit={invoices.data.limit} total={invoices.data.total} onPage={setPage} /> : null}
        </Card>

        {overview.data && overview.data.recentPayments.length ? (
          <Section title="Recent payments">
            <ul className="divide-y divide-line">
              {overview.data.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    {money(p.amount, p.currency)} from <Link href={`/workspaces/${p.workspace.id}`} className="text-signal-strong hover:underline">{p.workspace.name}</Link> against{" "}
                    <span className="font-mono text-xs">{p.invoiceReference}</span>
                  </span>
                  <span className="text-xs text-ink-faint">
                    {p.method} · {formatDate(p.receivedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </PageBody>
    </>
  );
}
