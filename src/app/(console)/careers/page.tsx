"use client";

import { Briefcase, Copy, ExternalLink, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Input, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { useJobs, useSetJobStatus } from "@/hooks/useJobs";
import { cn } from "@/lib/cn";
import { daysUntil, formatDateShort, isPastDeadline } from "@/lib/date";
import { DEPARTMENTS, type Job } from "@/types/job";

export default function CareersPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  const rows = useMemo(() => {
    const list = data ?? [];
    const term = search.trim().toLowerCase();

    return list
      .filter((job) => {
        if (department !== "ALL" && job.department !== department) return false;
        if (status !== "ALL" && job.status !== status) return false;
        if (!term) return true;
        return (
          job.title.toLowerCase().includes(term) ||
          job.location.toLowerCase().includes(term) ||
          job.department.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.applicationDeadline.localeCompare(b.applicationDeadline));
  }, [data, search, department, status]);

  const filtersActive = search.trim() !== "" || department !== "ALL" || status !== "ALL";
  const expiredCount = rows.filter((job) => job.status === "OPEN" && isPastDeadline(job.applicationDeadline)).length;

  return (
    <div className="pb-16">
      <PageHeader
        title="Careers"
        description="Roles the Scrubbe careers page serves."
        actions={
          <Link href="/careers/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              New role
            </Button>
          </Link>
        }
      />

      <div className="px-7 py-5">
        {expiredCount > 0 ? (
          <div className="mb-4 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink-muted">
            <span className="text-danger">{expiredCount}</span>{" "}
            {expiredCount === 1 ? "open role is" : "open roles are"} past the application deadline and still
            accepting applicants on the public page.
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location or department"
              className="pl-9"
              aria-label="Search roles"
            />
          </div>

          <Select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter by department"
            className="w-auto"
          >
            <option value="ALL">All departments</option>
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            aria-label="Filter by status"
            className="w-auto"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>

        <Card>
          {isLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : rows.length === 0 && filtersActive ? (
            <EmptyState
              title="No roles match that"
              body="Loosen the filters or clear the search."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setDepartment("ALL");
                    setStatus("ALL");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-6 w-6" />}
              title="No roles yet"
              body={<p>Roles you post to the careers page will show up here.</p>}
              action={
                <Link href="/careers/new">
                  <Button variant="primary" size="sm">
                    Post the first role
                  </Button>
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="px-4 py-2.5 font-normal">Role</th>
                  <th className="px-4 py-2.5 font-normal">Department</th>
                  <th className="px-4 py-2.5 font-normal">Type</th>
                  <th className="px-4 py-2.5 font-normal">Status</th>
                  <th className="px-4 py-2.5 font-normal">Deadline</th>
                  <th className="px-4 py-2.5 font-normal" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const router = useRouter();
  const setStatus = useSetJobStatus();
  const expired = isPastDeadline(job.applicationDeadline);
  const remaining = daysUntil(job.applicationDeadline);

  return (
    <tr className={cn("group transition-colors hover:bg-raised/50", expired && job.status === "OPEN" && "bg-danger-soft/60")}>
      <td className="px-4 py-3">
        <Link href={`/careers/${job.id}`} className="block min-w-0">
          <span className="block truncate text-ink group-hover:text-signal-strong">{job.title || "Untitled role"}</span>
          <span className="block truncate text-2xs text-ink-faint">
            {job.location || "No location"} · {job.jobLevel}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3 text-ink-muted">{job.department}</td>
      <td className="px-4 py-3 text-ink-muted">{job.employmentType}</td>
      <td className="px-4 py-3">
        <Badge tone={job.status === "OPEN" ? "live" : "draft"}>{job.status === "OPEN" ? "Open" : "Closed"}</Badge>
      </td>
      <td className="px-4 py-3">
        <span className={cn(expired ? "text-danger" : "text-ink-muted")}>
          {formatDateShort(job.applicationDeadline)}
        </span>
        {remaining !== null ? (
          <span className="block text-2xs text-ink-faint">
            {remaining < 0 ? `${Math.abs(remaining)} days ago` : `${remaining} days left`}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {job.applicationLink ? (
            <a
              href={job.applicationLink}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open the application link for ${job.title}`}
              className="rounded p-1.5 text-ink-faint transition-colors hover:text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}

          <button
            type="button"
            aria-label={`Duplicate ${job.title}`}
            onClick={() => router.push(`/careers/new?duplicate=${job.id}`)}
            className="rounded p-1.5 text-ink-faint transition-colors hover:text-ink"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>

          <Button
            size="sm"
            variant="ghost"
            loading={setStatus.isPending && setStatus.variables?.id === job.id}
            onClick={() => setStatus.mutate({ id: job.id, status: job.status === "OPEN" ? "CLOSED" : "OPEN" })}
          >
            {job.status === "OPEN" ? "Close" : "Reopen"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
