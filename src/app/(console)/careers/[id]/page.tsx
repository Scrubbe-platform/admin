"use client";

import { ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { JobForm } from "@/components/careers/JobForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useDeleteJob, useJob, useSetJobStatus, useUpdateJob } from "@/hooks/useJobs";
import { formatDate, isPastDeadline } from "@/lib/date";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: job, isLoading, isError, error, refetch } = useJob(id);
  const updateJob = useUpdateJob();
  const setStatus = useSetJobStatus();
  const deleteJob = useDeleteJob();

  if (isLoading) {
    return (
      <div className="space-y-4 px-7 py-7">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="m-7">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className="m-7">
        <EmptyState
          title="That role couldn't be found"
          body={<p>It may have been removed, or the link may be wrong.</p>}
          action={
            <Button size="sm" onClick={() => router.push("/careers")}>
              Back to all roles
            </Button>
          }
        />
      </Card>
    );
  }

  const expired = isPastDeadline(job.applicationDeadline);

  return (
    <div>
      <PageHeader
        title={job.title || "Untitled role"}
        description={
          job.status === "OPEN"
            ? `Open on the careers page. Applications close ${formatDate(job.applicationDeadline)}.`
            : "This role is closed. It is not on the careers page."
        }
        actions={
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All roles
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 px-7 pt-5">
        <Badge tone={job.status === "OPEN" ? "live" : "draft"}>{job.status === "OPEN" ? "Open" : "Closed"}</Badge>
        {expired && job.status === "OPEN" ? <Badge tone="danger">Deadline passed</Badge> : null}

        <Button
          size="sm"
          variant="ghost"
          loading={setStatus.isPending}
          onClick={() => setStatus.mutate({ id, status: job.status === "OPEN" ? "CLOSED" : "OPEN" })}
        >
          {job.status === "OPEN" ? "Close this role" : "Reopen this role"}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => router.push(`/careers/new?duplicate=${id}`)}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Duplicate
        </Button>
      </div>

      <JobForm
        existing={job}
        submitLabel="Save changes"
        saving={updateJob.isPending}
        deleting={deleteJob.isPending}
        onSubmit={(input) => updateJob.mutate({ id, input })}
        onDelete={() => deleteJob.mutate({ id }, { onSuccess: () => router.push("/careers") })}
      />
    </div>
  );
}
