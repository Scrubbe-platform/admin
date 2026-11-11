"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { ValidationList } from "@/components/comms/TemplateDialogs";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { CATEGORIES, categoryName } from "@/lib/comms/catalog";
import { createTemplate, findTemplate, suggestTemplateId, type WizardInput } from "@/lib/comms/operations";
import type { ValidationIssue } from "@/lib/comms/render";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CategoryId, Priority, TriggerType } from "@/types/comms";

const STEPS = ["Information", "Trigger", "Content and validation"];
const PRIORITIES: Priority[] = ["Critical", "High", "Normal", "Low"];
const TRIGGER_TYPES: TriggerType[] = ["Event-based", "Scheduled", "Manual", "System-generated"];

/** Creates a draft in three steps: what it is, what sends it, and what it says. */
export function CreateTemplateWizard({ onClose }: { onClose: () => void }) {
  const { state, update } = useComms();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardInput>(() => ({
    name: "",
    id: suggestTemplateId(state, "auth"),
    category: "auth",
    priority: "Normal",
    description: "",
    triggerType: "Event-based",
    event: "",
    subject: "",
    preview: "",
  }));

  const set = <K extends keyof WizardInput>(key: K, value: WizardInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Each error belongs to the step that collects the field, so Next only checks that step.
  const issues: (ValidationIssue & { step?: number })[] = [];
  const error = (message: string, onStep: number) => issues.push({ error: true, message, step: onStep });
  if (!form.name.trim()) error("Template name is required.", 1);
  if (!/^[A-Z]+-\d+$/.test(form.id) || findTemplate(state, form.id)) error("Template ID must be unique, like AUTH-15.", 1);
  if (!form.event.trim()) error("Trigger identifier is required.", 2);
  if (!form.subject.trim()) error("Subject is required.", 3);
  if (!form.description.trim()) issues.push({ error: false, message: "Add a description so reviewers understand the purpose." });
  if (!form.preview.trim()) issues.push({ error: false, message: "Preview text is empty." });

  const blockingFor = (onStep: number) => issues.find((issue) => issue.error && issue.step === onStep);

  function next() {
    const blocking = blockingFor(step);
    if (blocking) return toastError(null, blocking.message);
    setStep((s) => s + 1);
  }

  function save() {
    const blocking = issues.find((issue) => issue.error);
    if (blocking) return toastError(null, blocking.message);
    update((draft) => createTemplate(draft, form));
    toastSuccess(`${form.id} saved as a draft in ${categoryName(form.category)}.`);
    onClose();
    router.push(`/communications/categories/${form.category}`);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Create template: ${STEPS[step - 1]} (step ${step} of 3)`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {step > 1 ? <Button onClick={() => setStep((s) => s - 1)}>Back</Button> : null}
          {step < 3 ? (
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          ) : (
            <Button variant="primary" onClick={save}>
              Save draft
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {step === 1 ? (
          <>
            <Field label="Template name" htmlFor="wiz-name" required>
              <Input id="wiz-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </Field>
            <Field label="Template ID" htmlFor="wiz-id" required>
              <Input id="wiz-id" className="font-mono" value={form.id} onChange={(e) => set("id", e.target.value)} />
            </Field>
            <Field label="Category" htmlFor="wiz-cat">
              <Select
                id="wiz-cat"
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value as CategoryId;
                  setForm((f) => ({ ...f, category, id: suggestTemplateId(state, category) }));
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="wiz-pr">
              <Select id="wiz-pr" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="wiz-desc">
              <Textarea id="wiz-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="Trigger type" htmlFor="wiz-tt">
              <Select id="wiz-tt" value={form.triggerType} onChange={(e) => set("triggerType", e.target.value as TriggerType)}>
                {TRIGGER_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Trigger identifier" htmlFor="wiz-ev" required>
              <Input
                id="wiz-ev"
                className="font-mono"
                placeholder="e.g. incident.declared"
                value={form.event}
                onChange={(e) => set("event", e.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label="Subject" htmlFor="wiz-subj" required>
              <Input id="wiz-subj" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </Field>
            <Field label="Preview text" htmlFor="wiz-prev">
              <Input id="wiz-prev" value={form.preview} onChange={(e) => set("preview", e.target.value)} />
            </Field>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Validation</h3>
              <ValidationList issues={issues} />
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
