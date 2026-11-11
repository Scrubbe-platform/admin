"use client";

import { ArrowUpRight, Briefcase, Newspaper } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useBlogs } from "@/hooks/useBlogs";
import { useJobs } from "@/hooks/useJobs";
import { formatRelative, isPastDeadline } from "@/lib/date";

export default function DashboardPage() {
  const blogs = useBlogs();
  const jobs = useJobs();

  const published = blogs.data?.filter((blog) => blog.status === "PUBLISHED").length ?? 0;
  const drafts = blogs.data?.filter((blog) => blog.status === "DRAFT").length ?? 0;
  const openRoles = jobs.data?.filter((job) => job.status === "OPEN").length ?? 0;
  const expired = jobs.data?.filter((job) => isPastDeadline(job.applicationDeadline)).length ?? 0;

  const recent = [...(blogs.data ?? [])]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);

  return (
    <div className="pb-16">
      <PageHeader
        title="Dashboard"
        description="What the marketing site is currently serving from the Scrubbe API."
      />

      <div className="px-7 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Published posts"
            value={published}
            loading={blogs.isLoading}
            href="/blogs"
            icon={<Newspaper className="h-4 w-4" />}
          />
          <Stat
            label="Drafts"
            value={drafts}
            loading={blogs.isLoading}
            href="/blogs"
          />
          <Stat
            label="Open roles"
            value={openRoles}
            loading={jobs.isLoading}
            href="/careers"
            icon={<Briefcase className="h-4 w-4" />}
          />
          <Stat
            label="Past deadline"
            value={expired}
            loading={jobs.isLoading}
            tone={expired > 0 ? "danger" : "neutral"}
            href="/careers"
          />
        </div>

        <Card className="mt-6">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm text-ink">Recent edits</h2>
            <Link href="/blogs" className="text-xs text-ink-muted transition-colors hover:text-ink">
              All posts
            </Link>
          </div>

          {blogs.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : blogs.isError ? (
            <ErrorState error={blogs.error} onRetry={() => void blogs.refetch()} />
          ) : recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              Nothing has been published yet, so there is no edit history to show.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((blog) => (
                <li key={blog.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <Link href={`/blogs/${blog.id}`} className="min-w-0 text-sm text-ink hover:text-signal-strong">
                    <span className="block truncate">{blog.title}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-ink-faint">{formatRelative(blog.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  note,
  href,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  loading: boolean;
  note?: string;
  href: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-4 transition-colors group-hover:border-line-strong">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="flex items-center gap-2 text-sm">
            {icon}
            {label}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-12" />
        ) : (
          <p
            className={
              tone === "danger" && value > 0
                ? "mt-2 font-semibold text-3xl text-danger"
                : "mt-2 font-semibold text-3xl text-ink"
            }
          >
            {value}
          </p>
        )}
        {note ? <p className="mt-1.5 text-2xs leading-4 text-ink-faint">{note}</p> : null}
      </Card>
    </Link>
  );
}
