"use client";

import { Suspense } from "react";

import { AuthShell, SetPasswordForm } from "@/components/auth/AuthShell";

export default function AcceptInvitePage() {
  return (
    <AuthShell subtitle="You've been invited to the Scrubbe admin console. Choose a password, then sign in and set up two-factor authentication.">
      <Suspense fallback={null}>
        <SetPasswordForm kind="invite" />
      </Suspense>
    </AuthShell>
  );
}
