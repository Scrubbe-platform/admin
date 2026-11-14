"use client";

import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Field, Input } from "@/components/ui/primitives";
import { requestPasswordReset } from "@/lib/api/auth";
import { toastError } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setPending(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (error) {
      toastError(error, "Couldn't send the reset link.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell subtitle="Reset your admin console password.">
      {sent ? (
        <p className="text-sm leading-6 text-ink-muted">
          If <span className="text-ink">{email}</span> belongs to a staff account, a reset link is on its way. It works
          once and expires in an hour.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Staff email" htmlFor="email" required>
            <Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" className="w-full" loading={pending} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
