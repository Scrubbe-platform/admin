import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-7 py-5">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
