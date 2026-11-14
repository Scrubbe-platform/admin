"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Modal, TableSkeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";

// ── Formatting ───────────────────────────────────────────────────────────────

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function relative(value: string | null | undefined): string {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  const abs = Math.abs(diff);
  const units: Array<[number, string]> = [
    [365 * 86_400_000, "year"],
    [30 * 86_400_000, "month"],
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "minute"],
  ];
  for (const [ms, unit] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      return diff >= 0 ? `${n} ${unit}${n === 1 ? "" : "s"} ago` : `in ${n} ${unit}${n === 1 ? "" : "s"}`;
    }
  }
  return "just now";
}

export function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ""}`.trim();
  }
}

export const humanise = (v: string) => v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ── Layout pieces ────────────────────────────────────────────────────────────

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5 px-7 py-6", className)}>{children}</div>;
}

export function StatCard({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" | "caution"; href?: string }) {
  const body = (
    <Card className={cn("p-4", href && "transition-colors hover:border-line-strong")}>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={cn("mt-1 font-semibold text-2xl tabular-nums text-ink", tone === "danger" && "text-danger", tone === "caution" && "text-caution")}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-semibold text-sm text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function KeyValues({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
          <dt className="text-ink-faint">{k}</dt>
          <dd className="col-span-2 min-w-0 break-words text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  empty,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  empty: { title: string; body: ReactNode };
  rowHref?: (row: T) => string;
}) {
  if (isLoading) return <TableSkeleton rows={6} columns={Math.min(columns.length, 5)} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={empty.title} body={empty.body} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-faint">
            {columns.map((c) => (
              <th key={c.key} className={cn("whitespace-nowrap px-4 py-2.5 font-normal", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className={cn("align-top", rowHref && "cursor-pointer hover:bg-raised/60")}>
              {columns.map((c, i) => (
                <td key={c.key} className={cn("px-4 py-3", c.className)}>
                  {rowHref && i === 0 ? (
                    <Link href={rowHref(row)} className="text-ink hover:text-signal-strong">
                      {c.render(row)}
                    </Link>
                  ) : (
                    c.render(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return total > 0 ? <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">{total} total</p> : null;
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-ink-faint">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 py-1.5">
          {page} / {pages}
        </span>
        <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 pl-8" aria-label={placeholder} />
    </div>
  );
}

export function FilterTabs<V extends string>({ value, options, onChange }: { value: V; options: Array<{ value: V; label: string; count?: number }>; onChange: (v: V) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs transition-colors",
            value === o.value ? "bg-signal-soft text-signal-strong" : "text-ink-muted hover:bg-raised hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className="ml-1 tabular-nums text-ink-faint">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ── Status ───────────────────────────────────────────────────────────────────

const TONES: Record<string, "neutral" | "live" | "draft" | "danger" | "signal" | "caution" | "info"> = {
  ACTIVE: "live",
  OPEN: "caution",
  PUBLISHED: "live",
  PAID: "live",
  ACCEPTED: "live",
  RESOLVED: "live",
  APPROVED: "live",
  INVITED: "info",
  TRIALING: "info",
  ISSUED: "info",
  IN_PROGRESS: "info",
  PART_PAID: "caution",
  PENDING: "caution",
  NEW: "signal",
  DRAFT: "draft",
  OVERDUE: "danger",
  SUSPENDED: "danger",
  PAST_DUE: "danger",
  CANCELLED: "neutral",
  DECLINED: "neutral",
  EXPIRED: "neutral",
  VOID: "neutral",
  SPAM: "neutral",
  REJECTED: "neutral",
  INACTIVE: "neutral",
  CLOSED: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{humanise(status)}</Badge>;
}

// ── Charts ───────────────────────────────────────────────────────────────────

/** Daily bars; every bar has a tooltip with the exact count. */
export function BarSeries({ points, label }: { points: Array<{ date: string; count: number }>; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((t, p) => t + p.count, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-ink">{total}</p>
      </div>
      <div className="mt-2 flex h-16 items-end gap-[3px]" role="img" aria-label={`${label}: ${total} over ${points.length} days`}>
        {points.map((p) => (
          <div
            key={p.date}
            title={`${formatDate(p.date)}: ${p.count}`}
            className="flex-1 rounded-sm bg-signal/70 hover:bg-signal-strong"
            style={{ height: `${Math.max(p.count === 0 ? 2 : 8, (p.count / max) * 100)}%`, opacity: p.count === 0 ? 0.25 : 1 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-2xs text-ink-faint">
        <span>{formatDate(points[0]?.date)}</span>
        <span>{formatDate(points[points.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

// ── Reason-required confirmation ─────────────────────────────────────────────

/** Every moderation action needs a reason; it is stored in the audit log and, where relevant, sent to the affected person. */
export function ReasonDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  danger,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);
  const ok = reason.trim().length >= 5;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} disabled={!ok} loading={loading} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm leading-6 text-ink-muted">{body}</div>
        <Field label="Reason" htmlFor="reason" hint="Recorded in the audit log" required>
          <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you doing this?" />
        </Field>
      </div>
    </Modal>
  );
}
