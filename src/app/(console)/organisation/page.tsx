"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageBody, Section } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { ErrorState, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchOrganisation, saveOrganisation, type Organisation } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

const FIELDS: Array<{ key: keyof Organisation; label: string; hint?: string; multiline?: boolean }> = [
  { key: "name", label: "Trading name" },
  { key: "legalName", label: "Legal name", hint: "Printed on quotations and invoices" },
  { key: "supportEmail", label: "Support email" },
  { key: "billingEmail", label: "Billing email", hint: "Shown on billing documents" },
  { key: "address", label: "Registered address", multiline: true },
  { key: "taxId", label: "Tax ID / VAT number" },
];

export default function OrganisationPage() {
  const { can } = useCurrentUser();
  const editable = can("console.settings");
  const qc = useQueryClient();
  const org = useQuery({ queryKey: ["organisation"], queryFn: fetchOrganisation });
  const [draft, setDraft] = useState<Organisation | null>(null);
  useEffect(() => {
    if (org.data) setDraft(org.data);
  }, [org.data]);

  const save = useMutation({
    mutationFn: (v: Organisation) => saveOrganisation(v),
    onSuccess: (v) => {
      toastSuccess("Organisation saved");
      qc.setQueryData(["organisation"], v);
    },
    onError: (e) => toastError(e, "Couldn't save."),
  });

  return (
    <>
      <PageHeader title="Organisation" description="Scrubbe's own details. They appear on every quotation and invoice the console produces." />
      <PageBody>
        {org.isError ? (
          <Card><ErrorState error={org.error} onRetry={() => org.refetch()} /></Card>
        ) : !draft ? (
          <Card><TableSkeleton rows={4} /></Card>
        ) : (
          <Section title="Company details">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint} className={f.multiline ? "sm:col-span-2" : undefined}>
                  {f.multiline ? (
                    <Textarea id={f.key} rows={3} disabled={!editable} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                  ) : (
                    <Input id={f.key} disabled={!editable} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                  )}
                </Field>
              ))}
            </div>
            {editable ? (
              <div className="flex justify-end border-t border-line px-4 py-3">
                <Button variant="primary" disabled={JSON.stringify(draft) === JSON.stringify(org.data)} loading={save.isPending} onClick={() => save.mutate(draft)}>
                  Save
                </Button>
              </div>
            ) : null}
          </Section>
        )}
      </PageBody>
    </>
  );
}
