import type { ReactNode } from "react";

import { Badge, Card } from "@/components/ui/primitives";
import { providerOf } from "@/lib/acquisition/meetingLink";
import { cn } from "@/lib/cn";

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-ink-faint">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-raised/60 px-4 py-4 text-sm text-ink-muted">
      {children}
    </div>
  );
}

const STATUS_TONES: Record<string, "neutral" | "live" | "draft" | "signal"> = {
  Booked: "signal",
  Held: "live",
  Done: "live",
  Cancelled: "draft",
  "No-show": "draft",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{status}</Badge>;
}

/** Names the call service when the text holds a meeting link; renders nothing otherwise. */
export function MeetingProviderBadge({ text }: { text: string | undefined }) {
  const provider = providerOf(text);
  if (!provider) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-line bg-raised px-1.5 py-0.5 text-2xs leading-none text-ink-muted">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: provider.color }} aria-hidden />
      {provider.name}
    </span>
  );
}
