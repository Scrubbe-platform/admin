"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Logo } from "@/components/layout/Logo";
import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { useSignIn, useVerifyMfa } from "@/hooks/useAuth";
import type { MfaChallenge, MfaSetup } from "@/lib/api/auth";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  mfaCodeSchema,
  signInSchema,
  type MfaCodeValues,
  type SignInValues,
} from "@/schemas/auth";

export default function SignInPage() {
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const signIn = useSignIn(setMfaChallenge);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <h1>
            <Logo height={36} priority />
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Sign in to the editorial console.
          </p>
        </div>

        <Card className="p-6">
          {mfaChallenge ? (
            <MfaStep
              challenge={mfaChallenge}
              email={signIn.variables?.email}
              onBack={() => setMfaChallenge(null)}
            />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field
                label="Email"
                htmlFor="email"
                error={errors.email?.message}
                required
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                error={errors.password?.message}
                required
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              </Field>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={signIn.isPending}
              >
                Sign in
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-5 text-xs leading-5 text-ink-faint">
          Access needs a WORKSPACE_OWNER, ADMIN or SUPER_ADMIN role on your
          Scrubbe account.
        </p>
      </div>
    </div>
  );
}

function MfaStep({
  challenge,
  email,
  onBack,
}: {
  challenge: MfaChallenge;
  email: string | undefined;
  onBack: () => void;
}) {
  const verify = useVerifyMfa();

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm<MfaCodeValues>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit((values) =>
    verify.mutate(
      { mfaToken: challenge.mfaToken, code: values.code },
      {
        onError: () => {
          resetField("code");
          setFocus("code");
        },
      },
    ),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal-soft text-signal-strong">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-base font-semibold text-ink">
          {challenge.setup
            ? "Set up two-factor sign-in"
            : "Two-factor verification"}
        </h2>
      </div>

      {challenge.setup ? (
        <SetupKey setup={challenge.setup} />
      ) : (
        <p className="text-sm leading-6 text-ink-muted">
          Enter the 6-digit code from your authenticator app
          {email ? (
            <>
              {" "}
              for <span className="break-all text-ink">{email}</span>
            </>
          ) : null}
          .
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Authentication code"
          htmlFor="code"
          error={errors.code?.message}
          required
        >
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            className="font-mono text-base tracking-[0.4em]"
            invalid={Boolean(errors.code)}
            {...register("code")}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={verify.isPending}
        >
          Verify and sign in
        </Button>
      </form>

      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={verify.isPending}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Use a different account
      </Button>
    </div>
  );
}

function SetupKey({ setup }: { setup: MfaSetup }) {
  const grouped =
    setup.secret
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join(" ") ?? setup.secret;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret);
      toastSuccess("Setup key copied.");
    } catch {
      toastError(null, "Couldn't copy the key. Select it and copy it by hand.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-ink-muted">
        This account has no authenticator yet. In Google Authenticator, Authy or
        1Password, add an account using the setup key below, then enter the
        6-digit code it shows.
      </p>
      <div className="flex items-center gap-2 rounded-md border border-line bg-raised py-2 pl-3 pr-1.5">
        <code className="min-w-0 flex-1 break-all font-mono text-sm text-ink">
          {grouped}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          aria-label="Copy setup key"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
