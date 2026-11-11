"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { JobForm } from "@/components/careers/JobForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/primitives";
import { useCreateJob, useJob } from "@/hooks/useJobs";
import type { JobFormValues } from "@/schemas/job";

function NewJob() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate") ?? undefined;
  const { data: source } = useJob(duplicateId);
  const createJob = useCreateJob();

  /**
   * Duplicating copies everything except the deadline and the application link,
   * which are specific to the posting being copied. The title is marked so a
   * half-edited copy is never mistaken for the original.
   */
  const prefill: JobFormValues | undefined = source
    ? {
        title: `${source.title} (copy)`,
        department: source.department,
        employmentType: source.employmentType,
        location: source.location,
        jobLevel: source.jobLevel,
        salaryRange: source.salaryRange,
        description: source.description,
        responsibilities: source.responsibilities,
        requirements: source.requirements,
        benefits: source.benefits,
        applicationDeadline: "",
        applicationLink: null,
      }
    : undefined;

  return (
    <div>
      <PageHeader
        title={source ? `Duplicate of ${source.title}` : "New role"}
        description={
          source
            ? "Everything was copied except the deadline and application link. Set both before posting."
            : "Fill in the role below. The preview shows it exactly as it will appear on the careers page."
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

      <JobForm
        prefill={prefill}
        submitLabel="Create role"
        saving={createJob.isPending}
        onSubmit={(input) => createJob.mutate(input, { onSuccess: () => router.push("/careers") })}
      />
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<Skeleton className="m-7 h-96" />}>
      <NewJob />
    </Suspense>
  );
}
