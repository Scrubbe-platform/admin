"use client";

import { ArrowDownUp, Newspaper, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Input, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { useBlogs } from "@/hooks/useBlogs";
import { avatarColorOf, initialsOf } from "@/lib/author";
import { formatDateShort, formatRelative } from "@/lib/date";
import { BLOG_CATEGORIES, type Blog } from "@/types/blog";

type SortKey = "updated-desc" | "updated-asc" | "published-desc" | "published-asc";

export default function BlogsPage() {
  const { data, isLoading, isError, error, refetch } = useBlogs();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("updated-desc");

  const rows = useMemo(() => {
    const list = data ?? [];
    const term = search.trim().toLowerCase();

    const filtered = list.filter((blog) => {
      if (status !== "ALL" && blog.status !== status) return false;
      if (category !== "ALL" && blog.category !== category) return false;
      if (!term) return true;
      return (
        blog.title.toLowerCase().includes(term) ||
        blog.slug.toLowerCase().includes(term) ||
        blog.author.name.toLowerCase().includes(term) ||
        blog.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "updated-asc":
          return (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "");
        case "published-desc":
          return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
        case "published-asc":
          return (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "");
        default:
          return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
      }
    });
  }, [data, search, status, category, sort]);

  const filtersActive = search.trim() !== "" || status !== "ALL" || category !== "ALL";

  return (
    <div className="pb-16">
      <PageHeader
        title="Blogs"
        description="Posts the Scrubbe blog serves."
        actions={
          <Link href="/blogs/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              New post
            </Button>
          </Link>
        }
      />

      <div className="px-7 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, slug, author or tag"
              className="pl-9"
              aria-label="Search posts"
            />
          </div>

          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter by status" className="w-auto">
            <option value="ALL">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </Select>

          <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category" className="w-auto">
            <option value="ALL">All categories</option>
            {BLOG_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort" className="w-auto">
            <option value="updated-desc">Updated, newest</option>
            <option value="updated-asc">Updated, oldest</option>
            <option value="published-desc">Published, newest</option>
            <option value="published-asc">Published, oldest</option>
          </Select>
        </div>

        <Card>
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : rows.length === 0 && filtersActive ? (
            <EmptyState
              title="No posts match that"
              body="Loosen the filters or clear the search."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatus("ALL");
                    setCategory("ALL");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Newspaper className="h-6 w-6" />}
              title="No posts yet"
              body={<p>Posts you publish to the scrubbe.com blog will show up here.</p>}
              action={
                <Link href="/blogs/new">
                  <Button variant="primary" size="sm">
                    Write the first post
                  </Button>
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="px-4 py-2.5 font-normal">Title</th>
                  <th className="px-4 py-2.5 font-normal">Status</th>
                  <th className="px-4 py-2.5 font-normal">Category</th>
                  <th className="px-4 py-2.5 font-normal">Author</th>
                  <th className="px-4 py-2.5 font-normal">Published</th>
                  <th className="px-4 py-2.5 font-normal">
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownUp className="h-3 w-3" aria-hidden />
                      Updated
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((blog) => (
                  <BlogRow key={blog.id} blog={blog} />
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function BlogRow({ blog }: { blog: Blog }) {
  return (
    <tr className="group transition-colors hover:bg-raised/50">
      <td className="px-4 py-3">
        <Link href={`/blogs/${blog.id}`} className="block min-w-0">
          <span className="block truncate text-ink group-hover:text-signal-strong">{blog.title || "Untitled"}</span>
          <span className="block truncate font-mono text-2xs text-ink-faint">/{blog.slug}</span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <Badge tone={blog.status === "PUBLISHED" ? "live" : "draft"}>
          {blog.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-ink-muted">{blog.category}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs text-white"
            style={{ backgroundColor: avatarColorOf(blog.author.name) }}
            aria-hidden
          >
            {initialsOf(blog.author.name)}
          </span>
          <span className="truncate text-ink-muted">{blog.author.name || "—"}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-ink-muted">{formatDateShort(blog.publishedAt)}</td>
      <td className="px-4 py-3 text-ink-faint">{formatRelative(blog.updatedAt)}</td>
    </tr>
  );
}
