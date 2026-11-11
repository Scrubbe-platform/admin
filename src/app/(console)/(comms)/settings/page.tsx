"use client";

import type { ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, Switch } from "@/components/comms/parts";
import { ResetDemoCard } from "@/components/comms/ResetDemoCard";
import { Card, Select } from "@/components/ui/primitives";
import { toastSuccess } from "@/lib/toast";
import type { OrganisationSettings } from "@/types/comms";

function Row({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-ink-faint">{description}</span>
      </span>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { state, update } = useComms();
  const settings = state.settings;

  const set = <K extends keyof OrganisationSettings>(key: K, value: OrganisationSettings[K]) => {
    update((draft) => {
      draft.settings[key] = value;
    });
    toastSuccess("Setting saved (demonstration).");
  };

  const toggle = (key: "mfa" | "sso" | "ipAllowlist" | "digest", label: string) => (
    <Switch checked={settings[key]} label={label} onChange={(next) => set(key, next)} />
  );

  const choose = (key: "session" | "retention", options: string[], label: string) => (
    <Select className="w-auto" value={settings[key]} aria-label={label} onChange={(e) => set(key, e.target.value)}>
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </Select>
  );

  return (
    <div>
      <CommsHeader title="Settings" description="Security, data and notification settings for your organisation." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">Security</h2>
          <div className="mt-1 divide-y divide-line">
            <Row label="Require MFA" description="All members must use multi-factor authentication">
              {toggle("mfa", "Require MFA")}
            </Row>
            <Row label="Single sign-on" description="Sign in through your identity provider">
              {toggle("sso", "Single sign-on")}
            </Row>
            <Row label="IP allowlist" description="Restrict access to approved networks">
              {toggle("ipAllowlist", "IP allowlist")}
            </Row>
            <Row label="Session timeout" description="Sign out inactive users">
              {choose("session", ["30 minutes", "1 hour", "8 hours"], "Session timeout")}
            </Row>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">Data and notifications</h2>
          <div className="mt-1 divide-y divide-line">
            <Row label="Audit retention" description="How long audit records are kept">
              {choose("retention", ["1 year", "3 years", "7 years"], "Audit retention")}
            </Row>
            <Row label="Weekly digest" description="Operational intelligence summary by email">
              {toggle("digest", "Weekly digest")}
            </Row>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <ResetDemoCard description="Reset every module, template and setting to its original demonstration values." />
      </div>
    </div>
  );
}
