"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { NotWiredError } from "@/types/api";

import { Button, Card, Input, Skeleton } from "./primitives";

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-4", colIndex === 0 ? "w-1/3" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <h3 className="font-semibold text-lg text-ink">{title}</h3>
      <div className="max-w-md text-sm leading-6 text-ink-muted">{body}</div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  // Retrying an unwired operation only repeats the same failure, so it gets no button.
  const canRetry = !(error instanceof NotWiredError);
  const message = error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg text-ink">That request didn&apos;t go through</h3>
      <p className="max-w-md text-sm leading-6 text-ink-muted">{message}</p>
      {onRetry && canRetry ? (
        <Button size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/* ───────────── Modals ───────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <button type="button" className="fixed inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <Card
        className={cn(
          "relative z-10 w-full animate-fade-in shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-lg text-ink">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div> : null}
      </Card>
    </div>
  );
}

/** Destructive confirmation gated on typing an exact phrase. */
export function TypedConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  phrase,
  body,
  confirmLabel,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  phrase: string;
  body: ReactNode;
  confirmLabel: string;
  loading?: boolean;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim() === phrase;

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
          <Button variant="danger" onClick={onConfirm} disabled={!matches} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm leading-6 text-ink-muted">{body}</div>
        <div className="space-y-1.5">
          <label htmlFor="typed-confirm" className="text-sm text-ink">
            Type <span className="font-mono text-caution">{phrase}</span> to confirm
          </label>
          <Input
            id="typed-confirm"
            value={typed}
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
            placeholder={phrase}
          />
        </div>
      </div>
    </Modal>
  );
}
