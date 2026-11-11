"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BlogForm } from "@/components/blogs/BlogForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCreateBlog, usePublishBlog } from "@/hooks/useBlogs";
import type { BlogWriteInput } from "@/types/blog";

export default function NewBlogPage() {
  const createBlog = useCreateBlog();
  const publishBlog = usePublishBlog();

  /**
   * Publishing a post that does not exist yet is create-then-publish. Neither
   * half is wired, so the create call fails first and the publish never runs —
   * which is the correct order once both exist.
   */
  function onPublish(input: BlogWriteInput) {
    createBlog.mutate(input, {
      onSuccess: (created) => publishBlog.mutate({ id: created.id }),
    });
  }

  return (
    <div>
      <PageHeader
        title="New post"
        description="Write the post below. The preview shows it exactly as it will appear on scrubbe.com/blog."
        actions={
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All posts
          </Link>
        }
      />

      <BlogForm
        onSaveDraft={(input) => createBlog.mutate(input)}
        onPublish={onPublish}
        saving={createBlog.isPending}
        publishing={publishBlog.isPending}
      />
    </div>
  );
}
