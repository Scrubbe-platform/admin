"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { passwordProblem, setPasswordWithToken } from "@/lib/api/auth";
import { toastError, toastSuccess } from "@/lib/toast";

export function AuthShell({ subtitle, children, footer }: { subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <h1>
            <Logo height={36} priority />
          </h1>
          <p className="mt-3 text-sm text-ink-muted">{subtitle}</p>
        </div>
        <Card className="p-6">{children}</Card>
        <div className="mt-5 text-xs leading-5 text-ink-faint">
          {footer ?? (
            <Link href="/sign-in" className="text-signal-strong hover:underline">
              Back to sign-in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sets a password from an emailed single-use token: password reset or staff invite. */
export function SetPasswordForm({ kind }: { kind: "reset" | "invite" }) {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const problem = passwordProblem(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  if (!token) {
    return (
      <p className="text-sm leading-6 text-ink-muted">
        This link is missing its token. Open the link from your email again, or ask for a new one.
      </p>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem || password !== confirm) return;
    setPending(true);
    try {
      await setPasswordWithToken(kind, token, password);
      toastSuccess(kind === "invite" ? "Password set. Sign in to finish setting up two-factor authentication." : "Password updated. Sign in with your new password.");
      router.replace("/sign-in");
    } catch (error) {
      toastError(error, "Couldn't set your password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label={kind === "invite" ? "Choose a password" : "New password"}
        htmlFor="password"
        error={touched && problem ? problem : undefined}
        hint="12+ characters, letters and numbers or symbols"
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          invalid={touched && Boolean(problem)}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={mismatch ? "The passwords don't match." : undefined} required>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          invalid={mismatch}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Button type="submit" variant="primary" className="w-full" loading={pending}>
        {kind === "invite" ? "Accept invite" : "Set new password"}
      </Button>
    </form>
  );
}
