"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, RefreshCw, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { BlogCardPreview, BlogDetailPreview, type PreviewPost } from "@/components/blogs/BlogPreview";
import { CoverImageField } from "@/components/blogs/CoverImageField";
import { MarkdownField } from "@/components/blogs/MarkdownField";
import { TagInput } from "@/components/blogs/TagInput";
import { Badge, Button, Card, Field, Input, Select, Toggle } from "@/components/ui/primitives";
import { Modal, TypedConfirmDialog } from "@/components/ui/states";
import { isSlugTaken } from "@/lib/api/blogs";
import { cn } from "@/lib/cn";
import { countWords, readingTimeLabel } from "@/lib/reading-time";
import { slugify } from "@/lib/slug";
import { EXCERPT_MAX, blogFormSchema, emptyBlogForm, type BlogFormValues } from "@/schemas/blog";
import { BLOG_CATEGORIES, type Blog, type BlogWriteInput } from "@/types/blog";

type SlugCheck = { state: "idle" | "checking" | "available" | "taken" };

export function BlogForm({
  existing,
  onSaveDraft,
  onPublish,
  onDelete,
  saving,
  publishing,
  deleting,
}: {
  existing?: Blog | undefined;
  onSaveDraft: (input: BlogWriteInput) => void;
  onPublish: (input: BlogWriteInput) => void;
  onDelete?: (() => void) | undefined;
  saving: boolean;
  publishing: boolean;
  deleting?: boolean;
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const [slugCheck, setSlugCheck] = useState<SlugCheck>({ state: "idle" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const defaults: BlogFormValues = existing
    ? {
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt,
        content: existing.content,
        category: existing.category,
        tags: existing.tags,
        coverImageUrl: existing.coverImageUrl,
        authorName: existing.author.name,
        authorRole: existing.author.role ?? null,
        isFeatured: existing.isFeatured,
      }
    : emptyBlogForm;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const title = watch("title");
  const slug = watch("slug");
  const excerpt = watch("excerpt");
  const content = watch("content");

  // Title drives the slug until the author edits the slug themselves.
  useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title ?? ""), { shouldValidate: false });
  }, [title, slugTouched, setValue]);

  // Uniqueness check, debounced. Only sees published posts — see the note below.
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugCheck({ state: "idle" });
      return undefined;
    }
    let cancelled = false;
    setSlugCheck({ state: "checking" });
    const timer = setTimeout(() => {
      void isSlugTaken(slug, existing?.id)
        .then((taken) => {
          if (!cancelled) setSlugCheck({ state: taken ? "taken" : "available" });
        })
        .catch(() => {
          if (!cancelled) setSlugCheck({ state: "idle" });
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, existing?.id]);

  const words = useMemo(() => countWords(content ?? ""), [content]);

  function toWriteInput(values: BlogFormValues): BlogWriteInput {
    return {
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt.trim(),
      content: values.content,
      category: values.category,
      tags: values.tags,
      coverImageUrl: values.coverImageUrl,
      authorName: values.authorName.trim(),
      authorRole: values.authorRole,
      isFeatured: values.isFeatured,
    };
  }

  const submitDraft = handleSubmit((values) => onSaveDraft(toWriteInput(values)));
  const openPublish = handleSubmit(() => setPublishOpen(true));

  const previewPost: PreviewPost = {
    title: title ?? "",
    slug: slug ?? "",
    excerpt: excerpt ?? "",
    content: content ?? "",
    category: watch("category"),
    coverImageUrl: watch("coverImageUrl"),
    authorName: watch("authorName"),
    authorRole: watch("authorRole"),
    isFeatured: watch("isFeatured"),
    publishedAt: existing?.publishedAt ?? null,
  };

  const busy = saving || publishing || Boolean(deleting);

  return (
    <div className="pb-20">
      <form onSubmit={submitDraft} noValidate>
        <div className="grid gap-6 px-7 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Field label="Title" htmlFor="title" error={errors.title?.message} required>
              <Input id="title" invalid={Boolean(errors.title)} {...register("title")} />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              error={errors.slug?.message}
              required
              hint={<SlugHint check={slugCheck} />}
            >
              <div className="flex gap-2">
                <Input
                  id="slug"
                  invalid={Boolean(errors.slug) || slugCheck.state === "taken"}
                  {...register("slug", { onChange: () => setSlugTouched(true) })}
                />
                <Button
                  type="button"
                  size="md"
                  onClick={() => {
                    setValue("slug", slugify(getValues("title")), { shouldValidate: true });
                    setSlugTouched(false);
                  }}
                  aria-label="Regenerate the slug from the title"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <p className="text-2xs text-ink-faint">
                scrubbe.com/blog/<span className="text-ink-muted">{slug || "…"}</span>
              </p>
            </Field>

            <Field
              label="Excerpt"
              htmlFor="excerpt"
              error={errors.excerpt?.message}
              required
              hint={
                <span className={cn((excerpt?.length ?? 0) > EXCERPT_MAX && "text-danger")}>
                  {excerpt?.length ?? 0}/{EXCERPT_MAX}
                </span>
              }
            >
              <textarea
                id="excerpt"
                rows={3}
                className={cn(
                  "w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink",
                  "placeholder:text-ink-faint hover:border-line-strong focus:border-signal focus:outline-none",
                  errors.excerpt && "border-danger",
                )}
                placeholder="The two or three lines that show on the card."
                {...register("excerpt")}
              />
              <p className="text-2xs text-ink-faint">
                The card clips after three lines. Use the preview to see where it lands.
              </p>
            </Field>

            <Field
              label="Body"
              error={errors.content?.message}
              required
              hint={`${words} words · ${readingTimeLabel(words)}`}
            >
              <Controller
                control={control}
                name="content"
                render={({ field }) => (
                  <MarkdownField value={field.value} onChange={field.onChange} invalid={Boolean(errors.content)} />
                )}
              />
              <p className="text-2xs text-ink-faint">
                Reading time is computed from the body, so it can never go stale.
              </p>
            </Field>
          </div>

          <aside className="space-y-5">
            <Card className="space-y-4 p-4">
              <Field label="Category" htmlFor="category" error={errors.category?.message} required>
                <Select id="category" invalid={Boolean(errors.category)} {...register("category")}>
                  {BLOG_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Tags" htmlFor="tags" error={errors.tags?.message} required>
                <Controller
                  control={control}
                  name="tags"
                  render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />}
                />
              </Field>

              <Field label="Cover image" htmlFor="coverImageUrl" error={errors.coverImageUrl?.message}>
                <Controller
                  control={control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <CoverImageField id="coverImageUrl" value={field.value} onChange={field.onChange} />
                  )}
                />
              </Field>
            </Card>

            <Card className="space-y-4 p-4">
              <Field label="Author" htmlFor="authorName" error={errors.authorName?.message} required>
                <Input id="authorName" invalid={Boolean(errors.authorName)} {...register("authorName")} />
                <p className="text-2xs text-ink-faint">
                  Initials and avatar colour are derived from this name, so there is nothing else to pick.
                </p>
              </Field>

              <Field label="Author role" htmlFor="authorRole" error={errors.authorRole?.message}>
                <Controller
                  control={control}
                  name="authorRole"
                  render={({ field }) => (
                    <Input
                      id="authorRole"
                      value={field.value ?? ""}
                      placeholder="Security engineer"
                      onChange={(event) => field.onChange(event.target.value === "" ? null : event.target.value)}
                    />
                  )}
                />
              </Field>

              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <Toggle
                    id="isFeatured"
                    checked={field.value}
                    onChange={field.onChange}
                    label="Feature this post"
                    description="Featured posts take the lead slot on the blog index."
                  />
                )}
              />
            </Card>
          </aside>
        </div>

        <div className="sticky bottom-0 border-t border-line bg-surface/95 px-7 py-3.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              {existing ? (
                <Badge tone={existing.status === "PUBLISHED" ? "live" : "draft"}>
                  {existing.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
              ) : (
                <Badge tone="draft">New post</Badge>
              )}
              {isDirty ? <span>Unsaved changes</span> : null}
            </div>

            <div className="flex items-center gap-2">
              {onDelete ? (
                <Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </Button>
              ) : null}
              <Button type="button" onClick={() => setPreviewOpen(true)} disabled={busy}>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Preview
              </Button>
              <Button type="submit" loading={saving} disabled={busy}>
                Save as draft
              </Button>
              <Button type="button" variant="primary" onClick={openPublish} disabled={busy}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview" wide>
        <div className="space-y-7">
          <section>
            <h3 className="mb-3 text-sm text-ink-muted">On the blog index</h3>
            <BlogCardPreview post={previewPost} />
          </section>
          <section>
            <h3 className="mb-3 text-sm text-ink-muted">On the post page</h3>
            <BlogDetailPreview
              post={previewPost}
              html={
                <pre className="whitespace-pre-wrap font-ibm text-sm leading-7 text-ink-muted">
                  {previewPost.content || "The body renders here."}
                </pre>
              }
            />
          </section>
        </div>
      </Modal>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => {
          setPublishOpen(false);
          onPublish(toWriteInput(getValues()));
        }}
        post={previewPost}
        words={words}
        tags={watch("tags")}
        publishing={publishing}
      />

      <TypedConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete?.();
        }}
        title="Delete this post"
        phrase={existing?.slug ?? "delete"}
        confirmLabel="Delete post"
        loading={Boolean(deleting)}
        body={
          <div className="space-y-3">
            <p>
              This removes <span className="text-ink">{existing?.title}</span> and its body. It cannot be undone
              from here.
            </p>
          </div>
        }
      />
    </div>
  );
}

function SlugHint({ check }: { check: SlugCheck }) {
  if (check.state === "checking") return <span>Checking…</span>;
  if (check.state === "taken") return <span className="text-danger">A published post already uses this slug</span>;
  if (check.state === "available") return <span className="text-live">Not used by a published post</span>;
  return null;
}

function PublishDialog({
  open,
  onClose,
  onConfirm,
  post,
  words,
  tags,
  publishing,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  post: PreviewPost;
  words: number;
  tags: string[];
  publishing: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish this post"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={publishing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={publishing}>
            Publish now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-ink-muted">
          This is exactly what goes live on scrubbe.com/blog/{post.slug}.
        </p>

        <div className="grid gap-5 sm:grid-cols-[352px_minmax(0,1fr)]">
          <BlogCardPreview post={{ ...post, publishedAt: new Date().toISOString() }} />

          <dl className="space-y-2 text-sm">
            <Row label="Category" value={post.category} />
            <Row label="Author" value={post.authorName || "—"} />
            <Row label="Reading time" value={readingTimeLabel(words)} />
            <Row label="Tags" value={tags.length > 0 ? tags.join(", ") : "—"} />
            <Row label="Featured" value={post.isFeatured ? "Yes, takes the lead slot" : "No"} />
            <Row label="Cover image" value={post.coverImageUrl ? "Set" : "None — the card shows a blank panel"} />
          </dl>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-line pb-2 last:border-0">
      <dt className="w-28 shrink-0 text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-ink">{value}</dd>
    </div>
  );
}
