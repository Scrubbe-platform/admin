"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { useForm } from "react-hook-form";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { MeetingProviderBadge } from "@/components/acquisition/DeskParts";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { useSaveDesk } from "@/hooks/useAcquisition";
import { addMeetingLead } from "@/lib/acquisition/desk";
import { toastSuccess } from "@/lib/toast";
import { meetingLeadSchema, type MeetingLeadValues } from "@/schemas/acquisition";
import { LEAD_MEETING_STATUSES } from "@/types/acquisition";

/** Captures a prospect, a contact and a meeting in one form. Mount it fresh each time it opens. */
export function MeetingLeadDialog({ onClose }: { onClose: () => void }) {
  const desk = useDeskData();
  const router = useRouter();
  const save = useSaveDesk();
  const formId = useId();
  const idFor = (name: string) => `${formId}-${name}`;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MeetingLeadValues>({
    resolver: zodResolver(meetingLeadSchema),
    defaultValues: {
      company: "",
      contact: "",
      role: "",
      email: "",
      title: "Intro call",
      date: "",
      status: "Proposed",
      location: "",
      body: "",
    },
  });

  const onSubmit = handleSubmit((values) =>
    save.mutate(addMeetingLead(desk, values), {
      onSuccess: () => {
        toastSuccess("Meeting lead saved.");
        onClose();
        router.push("/acquisition/meetings");
      },
    }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="New meeting lead"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending}>
            Save meeting lead
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm leading-6 text-ink-muted">
        Creates the prospect, contact and meeting together. An existing company name is reused.
      </p>

      <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor={idFor("company")} error={errors.company?.message} required>
          <Input
            id={idFor("company")}
            list={idFor("companies")}
            autoComplete="off"
            invalid={Boolean(errors.company)}
            {...register("company")}
          />
          <datalist id={idFor("companies")}>
            {desk.companies.map((prospect) => (
              <option key={prospect.id} value={prospect.name} />
            ))}
          </datalist>
        </Field>

        <Field label="Contact full name" htmlFor={idFor("contact")}>
          <Input id={idFor("contact")} autoComplete="off" {...register("contact")} />
        </Field>

        <Field label="Role / title" htmlFor={idFor("role")}>
          <Input id={idFor("role")} {...register("role")} />
        </Field>

        <Field label="Work email" htmlFor={idFor("email")} error={errors.email?.message}>
          <Input id={idFor("email")} type="email" invalid={Boolean(errors.email)} {...register("email")} />
        </Field>

        <Field label="Meeting title" htmlFor={idFor("title")} error={errors.title?.message} required>
          <Input id={idFor("title")} invalid={Boolean(errors.title)} {...register("title")} />
        </Field>

        <Field label="Date / time (Lisbon or London local time)" htmlFor={idFor("date")}>
          <Input id={idFor("date")} type="datetime-local" {...register("date")} />
        </Field>

        <Field label="Meeting status" htmlFor={idFor("status")}>
          <Select id={idFor("status")} {...register("status")}>
            {LEAD_MEETING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Meeting link" htmlFor={idFor("location")}>
          <Input
            id={idFor("location")}
            placeholder="Paste a Zoom, Google Meet or Teams link"
            {...register("location")}
          />
          <MeetingProviderBadge text={watch("location")} />
        </Field>

        <Field label="Agenda / notes" htmlFor={idFor("body")} className="sm:col-span-2">
          <Textarea id={idFor("body")} rows={4} {...register("body")} />
        </Field>
      </form>
    </Modal>
  );
}
