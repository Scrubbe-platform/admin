"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import { useForm, type Resolver, type UseFormRegister } from "react-hook-form";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { MeetingProviderBadge } from "@/components/acquisition/DeskParts";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { useSaveDesk } from "@/hooks/useAcquisition";
import { deleteRecord, findRecord, todayInLondon, upsertRecord } from "@/lib/acquisition/desk";
import { FIELDS, RECORD_LABELS, type FieldSpec } from "@/lib/acquisition/fields";
import { toastSuccess } from "@/lib/toast";
import { recordSchema, type RecordValues } from "@/schemas/acquisition";
import type { DeskRecord, Prospect, RecordKind } from "@/types/acquisition";

export interface EditorTarget {
  kind: RecordKind;
  /** Edits this record; without it the dialog adds a new one. */
  id?: string;
  /** Pre-selects the company on a new contact, meeting, follow-up or note. */
  companyId?: string;
  /** Shown above the form, for when the dialog opened in place of the one asked for. */
  notice?: string;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function defaultValues(kind: RecordKind, existing: DeskRecord | undefined, companyId: string | undefined): RecordValues {
  return Object.fromEntries(
    FIELDS[kind].map((field) => {
      const current = existing?.[field.key];
      if (current !== undefined) return [field.key, current];
      if (field.type === "company") return [field.key, companyId ?? ""];
      if (kind === "notes" && field.key === "date") return [field.key, todayInLondon()];
      if (field.options && !field.allowBlank) return [field.key, field.options[0] ?? ""];
      return [field.key, ""];
    }),
  );
}

/** Adds, edits and deletes any desk record. Mount it fresh for each target so the form resets. */
export function RecordDialog({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const desk = useDeskData();
  const router = useRouter();
  const save = useSaveDesk();
  const formId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { kind, notice } = target;
  const existing = target.id ? findRecord(desk, kind, target.id) : undefined;
  const label = RECORD_LABELS[kind];
  const resolver = useMemo(() => zodResolver(recordSchema(kind)) as Resolver<RecordValues>, [kind]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RecordValues>({
    resolver,
    defaultValues: defaultValues(kind, existing, target.companyId),
  });

  const onSubmit = handleSubmit((values) => {
    const entry: DeskRecord = { ...values, id: existing?.id ?? crypto.randomUUID() };
    save.mutate(upsertRecord(desk, kind, entry), {
      onSuccess: () => {
        toastSuccess(`${sentenceCase(label)} saved.`);
        onClose();
        if (kind === "companies" && !existing) router.push(`/acquisition/pipeline/${entry.id}`);
      },
    });
  });

  function onDelete() {
    if (!existing) return;
    save.mutate(deleteRecord(desk, kind, existing.id), {
      onSuccess: () => {
        toastSuccess(`${sentenceCase(label)} deleted.`);
        onClose();
        if (kind === "companies") router.push("/acquisition/pipeline");
      },
    });
  }

  if (confirmingDelete && existing) {
    return (
      <Modal
        open
        onClose={() => setConfirmingDelete(false)}
        title={`Delete this ${label}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} loading={save.isPending}>
              Delete {label}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-muted">
          {kind === "companies" ? (
            <>
              This removes <span className="text-ink">{existing.name}</span> along with its contacts, notes, meetings
              and follow-ups. It can&apos;t be undone.
            </>
          ) : (
            "This can't be undone."
          )}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${existing ? "Edit" : "Add"} ${label}`}
      wide
      footer={
        <>
          {existing ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:text-danger"
              onClick={() => setConfirmingDelete(true)}
              disabled={save.isPending}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending}>
            Save {label}
          </Button>
        </>
      }
    >
      {notice ? (
        <p className="mb-4 rounded-md border border-line bg-raised px-3.5 py-2.5 text-sm text-ink-muted">{notice}</p>
      ) : null}
      <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {FIELDS[kind].map((field) => (
          <RecordField
            key={field.key}
            field={field}
            formId={formId}
            register={register}
            error={errors[field.key]?.message}
            prospects={desk.companies}
          >
            {kind === "meetings" && field.key === "location" ? <MeetingProviderBadge text={watch("location")} /> : null}
          </RecordField>
        ))}
      </form>
    </Modal>
  );
}

function RecordField({
  field,
  formId,
  register,
  error,
  prospects,
  children,
}: {
  field: FieldSpec;
  formId: string;
  register: UseFormRegister<RecordValues>;
  error: string | undefined;
  prospects: Prospect[];
  children?: ReactNode;
}) {
  const id = `${formId}-${field.key}`;
  const invalid = Boolean(error);

  let control: ReactNode;
  if (field.type === "textarea") {
    control = <Textarea id={id} rows={4} invalid={invalid} {...register(field.key)} />;
  } else if (field.type === "company") {
    control = (
      <Select id={id} invalid={invalid} {...register(field.key)}>
        <option value="">Select company</option>
        {prospects.map((prospect) => (
          <option key={prospect.id} value={prospect.id}>
            {prospect.name}
          </option>
        ))}
      </Select>
    );
  } else if (field.options) {
    control = (
      <Select id={id} invalid={invalid} {...register(field.key)}>
        {field.allowBlank ? <option value="">Not set</option> : null}
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  } else {
    const numeric = field.type === "number";
    control = (
      <Input
        id={id}
        type={field.type ?? "text"}
        min={numeric ? 0 : undefined}
        step={numeric ? 1 : undefined}
        invalid={invalid}
        {...register(field.key)}
      />
    );
  }

  return (
    <Field
      label={field.label}
      htmlFor={id}
      error={error}
      required={field.required}
      className={field.type === "textarea" ? "sm:col-span-2" : undefined}
    >
      {control}
      {children}
    </Field>
  );
}
