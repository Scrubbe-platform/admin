"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { formatDate, KeyValues, PageBody, relative, Section } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Field, Input } from "@/components/ui/primitives";
import { ErrorState, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { changePassword, fetchSessions, passwordProblem, revokeSession } from "@/lib/api/auth";
import { toastError, toastSuccess } from "@/lib/toast";
import { displayName, STAFF_ROLE_LABEL } from "@/types/user";

export default function AccountPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toastSuccess("Session ended");
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e) => toastError(e, "Couldn't end that session."),
  });

  return (
    <>
      <PageHeader title="My account" description="Your staff account, password and signed-in devices." />
      <PageBody>
        {user ? (
          <Section title="Profile">
            <KeyValues
              rows={[
                ["Name", displayName(user)],
                ["Email", user.email],
                ["Role", STAFF_ROLE_LABEL[user.role]],
                ["Two-factor", user.mfaEnabled ? "Enabled" : "Not set up"],
                ["Password last changed", user.passwordChangedAt ? formatDate(user.passwordChangedAt, true) : "Never"],
                ["This session ends", user.sessionExpiresAt ? formatDate(user.sessionExpiresAt, true) : "—"],
              ]}
            />
          </Section>
        ) : null}

        <PasswordSection />

        <Section title="Signed-in sessions" description="End any session you don't recognise.">
          {sessions.isLoading ? (
            <TableSkeleton rows={2} />
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          ) : (
            <ul className="divide-y divide-line">
              {sessions.data!.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{s.userAgent ?? "Unknown browser"}</p>
                    <p className="text-xs text-ink-faint">
                      {s.ipAddress ?? "Unknown IP"} · started {formatDate(s.createdAt, true)} · active {relative(s.lastUsedAt)}
                    </p>
                  </div>
                  {s.current ? <Badge tone="live">This device</Badge> : <Button size="sm" variant="ghost" loading={revoke.isPending} onClick={() => revoke.mutate(s.id)}>End session</Button>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </PageBody>
    </>
  );
}

function PasswordSection() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const problem = passwordProblem(next);
  const change = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      toastSuccess("Password changed. Your other sessions were signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTouched(false);
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e) => toastError(e, "Couldn't change your password."),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!current || problem || next !== confirm) return;
    change.mutate();
  };
  return (
    <Section title="Change password">
      <form onSubmit={submit} className="grid gap-4 p-4 sm:grid-cols-3" noValidate>
        <Field label="Current password" htmlFor="cur" required>
          <Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="new" error={touched && problem ? problem : undefined} required>
          <Input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm" htmlFor="conf" error={confirm && confirm !== next ? "Doesn't match" : undefined} required>
          <Input id="conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" variant="primary" loading={change.isPending}>Change password</Button>
        </div>
      </form>
    </Section>
  );
}
