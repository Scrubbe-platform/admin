"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge, Button } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import type { EmailTemplate } from "@/types/comms";

type Tone = "neutral" | "live" | "danger" | "caution" | "info";

const STATUS_TONES: Record<string, Tone> = {
  Published: "live",
  Approved: "info",
  "Pending Approval": "caution",
  Rejected: "danger",
  Delivered: "live",
  Sent: "live",
  Processing: "info",
  Deferred: "caution",
  Bounced: "danger",
  Failed: "danger",
  Enabled: "live",
  Success: "live",
  Pending: "caution",
  Critical: "danger",
  High: "caution",
  Verified: "live",
  Connected: "live",
  Active: "live",
  Error: "danger",
  Invited: "caution",
  Suspended: "danger",
  P0: "danger",
  P1: "caution",
  P2: "info",
  "Action Required": "caution",
  Operational: "info",
  Allowed: "live",
  Locked: "danger",
  Auto: "info",
};

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{status}</Badge>;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "h-5 w-9 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-signal bg-signal" : "border-line-strong bg-line-strong",
      )}
    >
      <span
        className={cn(
          "block h-3.5 w-3.5 rounded-full bg-canvas shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

/** States a rule the interface can't change, such as backend enforcement. */
export function Notice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-md border border-line bg-raised px-3 py-2 text-xs leading-5 text-ink-muted", className)}>
      {children}
    </p>
  );
}

export function KeyValueList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-faint">{label}</dt>
          <dd className="min-w-0 break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CommsHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Links to a template. Given only an id with no matching template (a tenant or policy), shows the id as text. */
export function TemplateLink({ template, id }: { template?: EmailTemplate; id?: string }) {
  const templateId = template?.id ?? id ?? "";
  if (!template) return <span className="font-mono text-xs text-ink-muted">{templateId}</span>;
  return (
    <Link
      href={`/communications/templates/${templateId}`}
      className="min-w-0 text-left text-sm text-signal-strong hover:underline"
    >
      <span className="font-mono text-xs">{templateId}</span> {template?.name}
    </Link>
  );
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * A small dropdown. It is fixed-positioned against its button, so a scrolling
 * table can't clip it. Closes on outside click, scroll, Escape, or choosing an item.
 */
export function ActionMenu({ label, items, ariaLabel }: { label: string; items: MenuItem[]; ariaLabel?: string }) {
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setAnchor(null);
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="inline-block">
      <Button
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          if (open) return setAnchor(null);
          const rect = event.currentTarget.getBoundingClientRect();
          setAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </Button>
      {anchor ? (
        <div
          role="menu"
          style={{ top: anchor.top, right: anchor.right }}
          className="fixed z-40 grid min-w-[190px] rounded-card border border-line bg-surface p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setAnchor(null);
                item.onSelect();
              }}
              className="rounded px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center justify-between px-1 py-2.5 text-sm text-ink-muted">
      <Button size="sm" onClick={() => onChange(page - 1)} disabled={page < 2}>
        Previous
      </Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages}>
        Next
      </Button>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-6 text-ink-muted">{body}</div>
    </Modal>
  );
}

export interface ListCardItem {
  key: string;
  start: ReactNode;
  end: ReactNode;
}

/** A titled card holding a short divided list, as on the overview. */
export function ListCard({ title, items, empty = "Nothing to show." }: { title: string; items: ListCardItem[]; empty?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2 divide-y divide-line">
        {items.length ? (
          items.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              {item.start}
              {item.end}
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-ink-faint">{empty}</p>
        )}
      </div>
    </div>
  );
}
