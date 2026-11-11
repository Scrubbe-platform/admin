"use client";

import type { ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, Notice, Switch } from "@/components/comms/parts";
import { Card, Select } from "@/components/ui/primitives";
import { SEVERITY_INFO } from "@/lib/comms/catalog";
import { toastSuccess } from "@/lib/toast";
import { SEVERITIES, SUBSCRIPTION_KEYS, type CommsState } from "@/types/comms";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-ink">{label}</span>
      {children}
    </div>
  );
}

export default function RecipientsPage() {
  const { state, update } = useComms();
  const recipients = state.recipients;

  const change = (recipe: (draft: CommsState) => void, message: string) => {
    update(recipe);
    toastSuccess(message);
  };

  return (
    <div>
      <CommsHeader
        title="Recipients & Preferences"
        description="Control who receives which communications. Mandatory messages cannot be switched off."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">Mandatory communications</h2>
          <Notice className="my-3">
            Security, account and critical operational notifications are required for the service and cannot be unsubscribed
            from.
          </Notice>
          <div className="divide-y divide-line">
            {["Authentication & account security", "Critical incident alerts (P0)", "Governance approvals and policy violations"].map(
              (label) => (
                <Row key={label} label={label}>
                  <Switch checked disabled label={`${label} (mandatory)`} />
                </Row>
              ),
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">Optional communications</h2>
          <div className="mt-2 divide-y divide-line">
            <Row label="Product communications">
              <Switch
                checked={recipients.product}
                label="Product communications"
                onChange={(next) => change((d) => void (d.recipients.product = next), "Preference saved.")}
              />
            </Row>
            <Row label="Marketing and corporate">
              <Switch
                checked={recipients.marketing}
                label="Marketing and corporate"
                onChange={(next) => change((d) => void (d.recipients.marketing = next), "Preference saved.")}
              />
            </Row>
            <Row label="Digest">
              <Select
                className="w-auto"
                value={recipients.digest}
                aria-label="Digest"
                onChange={(e) => change((d) => void (d.recipients.digest = e.target.value), "Preference saved.")}
              >
                {["Off", "Daily at 08:00", "Weekly on Monday"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </Row>
          </div>
          <h3 className="mb-2 mt-4 text-sm font-semibold text-ink">Incident severity subscriptions</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SEVERITIES.map((severity) => (
              <label key={severity} className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={recipients.severities[severity]}
                  onChange={(e) =>
                    change((d) => void (d.recipients.severities[severity] = e.target.checked), "Severity subscription saved.")
                  }
                />
                {severity} {SEVERITY_INFO[severity]?.label}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-7 text-base font-semibold text-ink">Recipient roles and event subscriptions</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              <th className="px-3 py-2.5 font-normal">Role</th>
              {SUBSCRIPTION_KEYS.map((key) => (
                <th key={key} className="px-3 py-2.5 font-normal">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recipients.roles.map((role, i) => (
              <tr key={role.name}>
                <td className="px-3 py-2.5 font-medium text-ink">{role.name}</td>
                {SUBSCRIPTION_KEYS.map((key) => (
                  <td key={key} className="px-3 py-2.5">
                    <Switch
                      checked={role.subscriptions[key]}
                      label={`${role.name} ${key}`}
                      onChange={(next) =>
                        change((d) => {
                          const target = d.recipients.roles[i];
                          if (target) target.subscriptions[key] = next;
                        }, "Subscription saved.")
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-ink-faint">
        Final recipient lists are resolved by backend services using roles, ownership and policy.
      </p>
    </div>
  );
}
