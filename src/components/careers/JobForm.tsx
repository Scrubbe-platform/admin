"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { BulletEditor } from "@/components/careers/BulletEditor";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal, TypedConfirmDialog } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate, isPastDeadline } from "@/lib/date";
import { emptyJobForm, jobFormSchema, type JobFormValues } from "@/schemas/job";
import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  JOB_LEVELS,
  type Job,
  type JobWriteInput,
} from "@/types/job";

export function JobForm({
  existing,
  prefill,
  onSubmit,
  onDelete,
  saving,
  deleting,
  submitLabel,
}: {
  existing?: Job | undefined;
  prefill?: JobFormValues | undefined;
  onSubmit: (input: JobWriteInput) => void;
  onDelete?: (() => void) | undefined;
  saving: boolean;
  deleting?: boolean;
  submitLabel: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const defaults: JobFormValues = existing
    ? {
        title: existing.title,
        department: existing.department,
        employmentType: existing.employmentType,
        location: existing.location,
        jobLevel: existing.jobLevel,
        salaryRange: existing.salaryRange,
        description: existing.description,
        responsibilities: existing.responsibilities,
        requirements: existing.requirements,
        benefits: existing.benefits,
        applicationDeadline: existing.applicationDeadline,
        applicationLink: existing.applicationLink,
      }
    : (prefill ?? emptyJobForm);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const deadline = watch("applicationDeadline");
  const description = watch("description");

  const submit = handleSubmit((values) =>
    onSubmit({
      title: values.title.trim(),
      department: values.department,
      employmentType: values.employmentType,
      location: values.location.trim(),
      jobLevel: values.jobLevel,
      salaryRange: values.salaryRange.trim(),
      description: values.description.trim(),
      responsibilities: values.responsibilities.filter((item) => item.trim() !== ""),
      requirements: values.requirements.filter((item) => item.trim() !== ""),
      benefits: values.benefits.filter((item) => item.trim() !== ""),
      applicationDeadline: values.applicationDeadline,
      applicationLink: values.applicationLink,
    }),
  );

  const remaining = deadline ? daysUntil(deadline) : null;
  const busy = saving || Boolean(deleting);

  return (
    <div className="pb-20">
      <form onSubmit={submit} noValidate>
        <div className="grid gap-6 px-7 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Field label="Role title" htmlFor="title" error={errors.title?.message} required>
              <Input id="title" invalid={Boolean(errors.title)} {...register("title")} />
            </Field>

            <Field
              label="About the role"
              htmlFor="description"
              error={errors.description?.message}
              required
              hint={`${description?.length ?? 0}/5000`}
            >
              <Textarea
                id="description"
                rows={6}
                invalid={Boolean(errors.description)}
                placeholder="What the role is, who it reports to, and why it exists."
                {...register("description")}
              />
            </Field>

            <Field label="Responsibilities" error={errors.responsibilities?.message} required>
              <Controller
                control={control}
                name="responsibilities"
                render={({ field }) => (
                  <BulletEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Own the incident triage rotation"
                    addLabel="Add a responsibility"
                    invalid={Boolean(errors.responsibilities)}
                  />
                )}
              />
            </Field>

            <Field label="Requirements" error={errors.requirements?.message} required>
              <Controller
                control={control}
                name="requirements"
                render={({ field }) => (
                  <BulletEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Four years running production services"
                    addLabel="Add a requirement"
                    invalid={Boolean(errors.requirements)}
                  />
                )}
              />
            </Field>

            <Field label="Benefits" error={errors.benefits?.message}>
              <Controller
                control={control}
                name="benefits"
                render={({ field }) => (
                  <BulletEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Private health cover from day one"
                    addLabel="Add a benefit"
                    invalid={Boolean(errors.benefits)}
                  />
                )}
              />
            </Field>
          </div>

          <aside className="space-y-5">
            <Card className="space-y-4 p-4">
              <Field label="Department" htmlFor="department" error={errors.department?.message} required>
                <Select id="department" invalid={Boolean(errors.department)} {...register("department")}>
                  {DEPARTMENTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Employment type" htmlFor="employmentType" error={errors.employmentType?.message} required>
                <Select id="employmentType" invalid={Boolean(errors.employmentType)} {...register("employmentType")}>
                  {EMPLOYMENT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Level" htmlFor="jobLevel" error={errors.jobLevel?.message} required>
                <Select id="jobLevel" invalid={Boolean(errors.jobLevel)} {...register("jobLevel")}>
                  {JOB_LEVELS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Location" htmlFor="location" error={errors.location?.message} required>
                <Input
                  id="location"
                  placeholder="Port Harcourt, or Remote (WAT ±2)"
                  invalid={Boolean(errors.location)}
                  {...register("location")}
                />
              </Field>

              <Field label="Salary range" htmlFor="salaryRange" error={errors.salaryRange?.message} required>
                <Input
                  id="salaryRange"
                  placeholder="60k-90k/year"
                  invalid={Boolean(errors.salaryRange)}
                  {...register("salaryRange")}
                />
              </Field>
            </Card>

            <Card className="space-y-4 p-4">
              <Field
                label="Application deadline"
                htmlFor="applicationDeadline"
                error={errors.applicationDeadline?.message}
                required
                hint={
                  remaining === null ? null : remaining < 0 ? (
                    <span className="text-danger">{Math.abs(remaining)} days ago</span>
                  ) : (
                    <span>{remaining} days left</span>
                  )
                }
              >
                <Input
                  id="applicationDeadline"
                  type="date"
                  invalid={Boolean(errors.applicationDeadline)}
                  {...register("applicationDeadline")}
                />
                <p className="text-2xs leading-4 text-ink-faint">
                  Stored as ISO 8601. The old form used mm/dd/yy, which cannot be sorted and has no century.
                </p>
              </Field>

              <Field label="Application link" htmlFor="applicationLink" error={errors.applicationLink?.message}>
                <Controller
                  control={control}
                  name="applicationLink"
                  render={({ field }) => (
                    <Input
                      id="applicationLink"
                      placeholder="https://…"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value === "" ? null : event.target.value)}
                    />
                  )}
                />
                <p className="text-2xs leading-4 text-ink-faint">
                  Leave this empty and the public page shows no apply button.
                </p>
              </Field>
            </Card>
          </aside>
        </div>

        <div className="sticky bottom-0 border-t border-line bg-surface/95 px-7 py-3.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              {existing ? (
                <Badge tone={existing.status === "OPEN" ? "live" : "draft"}>
                  {existing.status === "OPEN" ? "Open" : "Closed"}
                </Badge>
              ) : (
                <Badge tone="draft">New role</Badge>
              )}
              {deadline && isPastDeadline(deadline) ? (
                <Badge tone="danger">Deadline passed</Badge>
              ) : null}
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
              <Button type="submit" variant="primary" loading={saving} disabled={busy}>
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="How the careers page shows this" wide>
        <JobPreview values={watch()} />
      </Modal>

      <TypedConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete?.();
        }}
        title="Delete this role"
        phrase={existing?.title ?? "delete"}
        confirmLabel="Delete role"
        loading={Boolean(deleting)}
        body={
          <div className="space-y-3">
            <p>
              Closing a role hides it from the careers page and keeps the record. Deleting removes it for good.
              If you only want applications to stop, close it instead.
            </p>
          </div>
        }
      />
    </div>
  );
}

function JobPreview({ values }: { values: JobFormValues }) {
  const sections: Array<{ heading: string; items: string[] }> = [
    { heading: "What you'll do", items: values.responsibilities.filter(Boolean) },
    { heading: "What we're looking for", items: values.requirements.filter(Boolean) },
    { heading: "Benefits", items: values.benefits.filter(Boolean) },
  ];

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <h2 className="font-semibold text-2xl leading-tight text-ink">{values.title || "Untitled role"}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>{values.department}</span>
          <span aria-hidden>·</span>
          <span>{values.employmentType}</span>
          <span aria-hidden>·</span>
          <span>{values.location || "Location not set"}</span>
          <span aria-hidden>·</span>
          <span>{values.jobLevel}</span>
        </div>
        <p className="text-sm text-signal-strong">{values.salaryRange || "Salary not set"}</p>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-7 text-ink-muted">
        {values.description || "The description shows here."}
      </p>

      {sections.map((section) =>
        section.items.length > 0 ? (
          <section key={section.heading}>
            <h3 className="font-semibold text-base text-ink">{section.heading}</h3>
            <ul className="mt-2 space-y-1.5">
              {section.items.map((item, index) => (
                <li key={index} className="flex gap-2.5 text-sm leading-6 text-ink-muted">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}

      <footer
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm",
          values.applicationDeadline && isPastDeadline(values.applicationDeadline) && "text-danger",
        )}
      >
        <span className="text-ink-muted">
          Applications close {values.applicationDeadline ? formatDate(values.applicationDeadline) : "— not set"}
        </span>
        {values.applicationLink ? (
          <span className="rounded-md bg-signal-strong px-3 py-1.5 text-xs text-canvas">Apply</span>
        ) : (
          <span className="text-xs text-ink-faint">No application link, so no apply button</span>
        )}
      </footer>
    </article>
  );
}
