"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { FilterTabs, formatDate, PageBody, Pager, SearchInput, StatusBadge, Toolbar, useDebounced } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, Field, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { fetchInbox, updateInboxItem, type InboxItem, type InboxStatus } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

export default function InboxPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<InboxStatus | "">("NEW");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const query = useDebounced(q);
  const list = useQuery({ queryKey: ["inbox", status, query, page], queryFn: () => fetchInbox({ status, q: query, page, limit: 25 }), placeholderData: keepPreviousData });
  const counts = list.data?.counts ?? {};

  return (
    <>
      <PageHeader title="Inbox" description="Contact-form messages and billing change requests from workspaces. Reply from your own mail client; track the state here." />
      <PageBody>
        <div className="grid gap-3 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <Toolbar>
              <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search sender or subject" />
              <FilterTabs
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); setSelected(null); }}
                options={[
                  { value: "NEW", label: "New", count: counts.NEW ?? 0 },
                  { value: "IN_PROGRESS", label: "In progress", count: counts.IN_PROGRESS ?? 0 },
                  { value: "RESOLVED", label: "Resolved", count: counts.RESOLVED ?? 0 },
                  { value: "SPAM", label: "Spam", count: counts.SPAM ?? 0 },
                  { value: "", label: "All" },
                ]}
              />
            </Toolbar>
            {list.isLoading ? (
              <TableSkeleton rows={6} columns={2} />
            ) : list.isError ? (
              <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data?.items.length ? (
              <EmptyState icon={<Mail className="h-6 w-6" />} title="Nothing here" body="New messages from the website appear in New." />
            ) : (
              <ul className="divide-y divide-line">
                {list.data.items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(m)}
                      className={cn("w-full px-4 py-3 text-left text-sm hover:bg-raised/60", selected?.id === m.id && "bg-signal-soft/50")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-ink">{m.subject || "(no subject)"}</span>
                        <span className="shrink-0 text-2xs text-ink-faint">{formatDate(m.createdAt)}</span>
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        {m.name} · {m.email}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
          </Card>
          <div className="lg:col-span-3">
            {selected ? (
              <MessageView
                key={selected.id}
                message={selected}
                onUpdated={(m) => {
                  setSelected(m);
                  void qc.invalidateQueries({ queryKey: ["inbox"] });
                  void qc.invalidateQueries({ queryKey: ["overview"] });
                }}
              />
            ) : (
              <Card>
                <EmptyState title="Select a message" body="Its full text, sender and handling notes appear here." />
              </Card>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function MessageView({ message, onUpdated }: { message: InboxItem; onUpdated: (m: InboxItem) => void }) {
  const [note, setNote] = useState(message.internalNote ?? "");
  useEffect(() => setNote(message.internalNote ?? ""), [message.internalNote]);
  const update = useMutation({
    mutationFn: (data: { status?: InboxStatus; internalNote?: string | null }) => updateInboxItem(message.id, data),
    onSuccess: (m) => {
      toastSuccess("Saved");
      onUpdated(m);
    },
    onError: (e) => toastError(e, "Couldn't update the message."),
  });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold text-lg text-ink">{message.subject || "(no subject)"}</h2>
          <p className="text-sm text-ink-muted">
            {message.name} ·{" "}
            <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? ""}`)}`} className="text-signal-strong hover:underline">
              {message.email}
            </a>{" "}
            · {formatDate(message.createdAt, true)}
          </p>
        </div>
        <StatusBadge status={message.status} />
      </div>
      <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-6 text-ink">{message.message}</p>
      <div className="space-y-3 border-t border-line px-5 py-4">
        <Field label="Internal note" htmlFor="note" hint="Only staff see this">
          <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={note === (message.internalNote ?? "")} loading={update.isPending} onClick={() => update.mutate({ internalNote: note || null })}>
            Save note
          </Button>
          {message.status !== "IN_PROGRESS" ? <Button size="sm" onClick={() => update.mutate({ status: "IN_PROGRESS" })}>Mark in progress</Button> : null}
          {message.status !== "RESOLVED" ? <Button size="sm" variant="primary" onClick={() => update.mutate({ status: "RESOLVED" })}>Resolve</Button> : null}
          {message.status !== "SPAM" ? <Button size="sm" variant="ghost" onClick={() => update.mutate({ status: "SPAM" })}>Spam</Button> : null}
          {message.handledAt ? <span className="self-center text-xs text-ink-faint">Last handled {formatDate(message.handledAt, true)}</span> : null}
        </div>
      </div>
    </Card>
  );
}
