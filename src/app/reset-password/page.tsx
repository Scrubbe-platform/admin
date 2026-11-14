"use client";

import { Suspense } from "react";

import { AuthShell, SetPasswordForm } from "@/components/auth/AuthShell";

export default function ResetPasswordPage() {
  return (
    <AuthShell subtitle="Choose a new password. Every other session on your account will be signed out.">
      <Suspense fallback={null}>
        <SetPasswordForm kind="reset" />
      </Suspense>
    </AuthShell>
  );
}
