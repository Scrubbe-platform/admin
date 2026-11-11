"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { BlogForm } from "@/components/blogs/BlogForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  useBlog,
  useDeleteBlog,
  usePublishBlog,
  useUnpublishBlog,
  useUpdateBlog,
} from "@/hooks/useBlogs";
import { formatDate } from "@/lib/date";
import type { BlogWriteInput } from "@/types/blog";

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: blog, isLoading, isError, error, refetch } = useBlog(id);
  const updateBlog = useUpdateBlog();
  const publishBlog = usePublishBlog();
  const unpublishBlog = useUnpublishBlog();
  const deleteBlog = useDeleteBlog();

  function onSaveDraft(input: BlogWriteInput) {
    updateBlog.mutate({ id, input });
  }

  function onPublish(input: BlogWriteInput) {
    // Save the current edits first so publishing never puts stale copy live.
    updateBlog.mutate(
      { id, input },
      { onSuccess: () => publishBlog.mutate({ id }) },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-7 py-7">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[420px] w-full" />
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

  if (!blog) {
    return (
      <Card className="m-7">
        <EmptyState
          title="That post couldn't be found"
          body={<p>It may have been deleted, or the link may be wrong.</p>}
          action={
            <Button size="sm" onClick={() => router.push("/blogs")}>
              Back to all posts
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={blog.title || "Untitled post"}
        description={
          blog.status === "PUBLISHED"
            ? `Live since ${formatDate(blog.publishedAt)}. Edits go live the moment they save.`
            : "This post is a draft. It is not on the public site."
        }
        actions={
          <div className="flex items-center gap-3">
            {blog.status === "PUBLISHED" ? (
              <a
                href={`https://scrubbe.com/blog/${blog.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                View on the site
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All posts
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 px-7 pt-5">
        <Badge tone={blog.status === "PUBLISHED" ? "live" : "draft"}>
          {blog.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
        {blog.status === "PUBLISHED" ? (
          <Button
            size="sm"
            variant="ghost"
            loading={unpublishBlog.isPending}
            onClick={() => unpublishBlog.mutate({ id })}
          >
            Return to draft
          </Button>
        ) : null}
      </div>

      <BlogForm
        existing={blog}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onDelete={() =>
          deleteBlog.mutate({ id }, { onSuccess: () => router.push("/blogs") })
        }
        saving={updateBlog.isPending}
        publishing={publishBlog.isPending}
        deleting={deleteBlog.isPending}
      />
    </div>
  );
}
