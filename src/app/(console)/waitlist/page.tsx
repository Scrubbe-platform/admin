"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { FilterTabs, formatDate, KeyValues, PageBody, Pager, SearchInput, StatusBadge, Toolbar, useDebounced } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Modal, TableSkeleton } from "@/components/ui/states";
import { fetchWaitlist, fetchWaitlistStats, waitlistAction, type WaitlistEntry, type WaitlistStatus } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

export default function WaitlistPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<WaitlistStatus | "">("PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<WaitlistEntry | null>(null);
  const search = useDebounced(q);
  const stats = useQuery({ queryKey: ["waitlist-stats"], queryFn: fetchWaitlistStats });
  const list = useQuery({ queryKey: ["waitlist", status, search, page], queryFn: () => fetchWaitlist({ status, search, page, limit: 25 }), placeholderData: keepPreviousData });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "invite" | "reject" }) => waitlistAction(id, action),
    onSuccess: (_d, v) => {
      toastSuccess(v.action === "invite" ? "Invite emailed" : v.action === "approve" ? "Approved" : "Rejected");
      setOpen(null);
      void qc.invalidateQueries({ queryKey: ["waitlist"] });
      void qc.invalidateQueries({ queryKey: ["waitlist-stats"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toastError(e, "That didn't go through."),
  });

  const s = stats.data;
  return (
    <>
      <PageHeader title="Waitlist" description="People who asked for early access. Approve to shortlist, invite to email them an access code." />
      <PageBody>
        <Card>
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or company" />
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "PENDING", label: "Pending", count: s?.pending },
                { value: "APPROVED", label: "Approved", count: s?.approved },
                { value: "INVITED", label: "Invited", count: s?.invited },
                { value: "REJECTED", label: "Rejected", count: s?.rejected },
                { value: "", label: "All", count: s?.total },
              ]}
            />
          </Toolbar>
          {list.isLoading ? (
            <TableSkeleton rows={6} />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : !list.data?.entries.length ? (
            <EmptyState title="Nobody here" body="Nothing in this view." />
          ) : (
            <ul className="divide-y divide-line">
              {list.data.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <button type="button" onClick={() => setOpen(e)} className="min-w-0 text-left">
                    <p className="font-medium text-ink hover:text-signal-strong">
                      {e.fullName} · {e.company}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {e.workEmail} · {e.jobTitle} · {e.companySize} · applied {formatDate(e.createdAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={e.status} />
                    {e.status === "PENDING" ? (
                      <Button size="sm" onClick={() => act.mutate({ id: e.id, action: "approve" })}>Approve</Button>
                    ) : null}
                    {e.status === "PENDING" || e.status === "APPROVED" ? (
                      <Button size="sm" variant="primary" onClick={() => act.mutate({ id: e.id, action: "invite" })}>Invite</Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>

      {open ? (
        <Modal
          open
          wide
          onClose={() => setOpen(null)}
          title={`${open.fullName} — ${open.company}`}
          footer={
            <>
              {open.status !== "REJECTED" && open.status !== "INVITED" ? (
                <Button variant="ghost" loading={act.isPending} onClick={() => act.mutate({ id: open.id, action: "reject" })}>Reject</Button>
              ) : null}
              {open.status === "PENDING" ? <Button loading={act.isPending} onClick={() => act.mutate({ id: open.id, action: "approve" })}>Approve</Button> : null}
              {open.status === "PENDING" || open.status === "APPROVED" ? (
                <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ id: open.id, action: "invite" })}>Send invite</Button>
              ) : null}
            </>
          }
        >
          <KeyValues
            rows={[
              ["Email", open.workEmail],
              ["Role", open.jobTitle],
              ["Company", `${open.company} (${open.companyWebsite})`],
              ["Size / industry", `${open.companySize} · ${open.industry} · ${open.country}`],
              ["Stack", `${open.cloudProvider} · ${open.deploymentModel} · ${open.primaryLanguage}`],
              ["Observability / incidents", `${open.observabilityStack} · ${open.incidentPlatform}`],
              ["Incidents per month", open.incidentsPerMonth ?? "—"],
              ["Challenges", open.challenges.join(", ") || "—"],
              ["Interested in", open.interests.join(", ") || "—"],
              ["Notes from applicant", open.additionalNotes ?? "—"],
              ["Invite sent", open.inviteSentAt ? formatDate(open.inviteSentAt, true) : "No"],
            ]}
          />
        </Modal>
      ) : null}
    </>
  );
}
