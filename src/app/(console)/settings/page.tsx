"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageBody, Section } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, Field, Input, Textarea, Toggle } from "@/components/ui/primitives";
import { ErrorState, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchConsoleSettings, saveConsoleSettings, type ConsoleSettings } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

/** Console security. Every value here is enforced by the API on each staff request. */
export default function ConsoleSettingsPage() {
  const { can } = useCurrentUser();
  const editable = can("console.settings");
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["console-settings"], queryFn: fetchConsoleSettings });
  const [draft, setDraft] = useState<ConsoleSettings | null>(null);
  const [allowText, setAllowText] = useState("");

  useEffect(() => {
    if (settings.data) {
      setDraft(settings.data);
      setAllowText(settings.data.ipAllowlist.join("\n"));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (value: ConsoleSettings) => saveConsoleSettings(value),
    onSuccess: (saved) => {
      toastSuccess("Console security saved");
      qc.setQueryData(["console-settings"], saved);
    },
    onError: (e) => toastError(e, "Couldn't save."),
  });

  const allowlist = allowText.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const dirty = draft && settings.data && (JSON.stringify({ ...draft, ipAllowlist: allowlist }) !== JSON.stringify(settings.data));

  return (
    <>
      <PageHeader title="Console security" description="How staff sign in and how long sessions last. Enforced by the API, not just this page." />
      <PageBody>
        {settings.isError ? (
          <Card><ErrorState error={settings.error} onRetry={() => settings.refetch()} /></Card>
        ) : !draft ? (
          <Card><TableSkeleton rows={4} /></Card>
        ) : (
          <>
            <Section title="Sign-in">
              <div className="space-y-4 p-4">
                <Toggle
                  id="mfa"
                  checked={draft.requireMfa}
                  onChange={(v) => editable && setDraft({ ...draft, requireMfa: v })}
                  label="Require two-factor authentication"
                  description="Staff without an authenticator are made to set one up before their first session. Strongly recommended."
                />
              </div>
            </Section>
            <Section title="Sessions">
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Field label="Maximum session length (hours)" htmlFor="sh" hint="1–72">
                  <Input id="sh" type="number" min={1} max={72} disabled={!editable} value={draft.sessionHours} onChange={(e) => setDraft({ ...draft, sessionHours: Number(e.target.value) })} />
                </Field>
                <Field label="Sign out after inactivity (minutes)" htmlFor="im" hint="5–1440">
                  <Input id="im" type="number" min={5} max={1440} disabled={!editable} value={draft.idleMinutes} onChange={(e) => setDraft({ ...draft, idleMinutes: Number(e.target.value) })} />
                </Field>
              </div>
            </Section>
            <Section title="Network allowlist" description="When set, the console and staff sign-in only work from these addresses. Leave empty to allow any network.">
              <div className="space-y-2 p-4">
                <Field label="IP addresses or CIDR ranges, one per line" htmlFor="ip">
                  <Textarea id="ip" rows={4} disabled={!editable} value={allowText} onChange={(e) => setAllowText(e.target.value)} placeholder={"203.0.113.10\n198.51.100.0/24"} className="font-mono" />
                </Field>
                <p className="text-xs text-caution">Include the address you&apos;re using now, or you&apos;ll lock yourself out until someone clears it in the database.</p>
              </div>
            </Section>
            {editable ? (
              <div className="flex justify-end">
                <Button variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ ...draft, ipAllowlist: allowlist })}>
                  Save changes
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-faint">Only owners can change console security.</p>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
