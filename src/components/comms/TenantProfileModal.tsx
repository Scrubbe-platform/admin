"use client";

import { useState, type ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { Notice, StatusBadge, Switch } from "@/components/comms/parts";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import {
  CATEGORIES,
  LOCALES,
  RESPONSIBILITY_TARGETS,
  TIMEZONES,
  formatTimestamp,
  isMandatoryCategory,
} from "@/lib/comms/catalog";
import { deliveryLogs } from "@/lib/comms/logs";
import { logChange } from "@/lib/comms/operations";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CategoryId, ModuleRow, TenantProfile } from "@/types/comms";

function defaultProfile(tenant: ModuleRow): TenantProfile {
  const domain = tenant.domain ?? "example.com";
  return {
    tenantId: `tnt_${tenant.id.toLowerCase().replace("-", "")}`,
    contacts: {
      admin: `admin@${domain}`,
      engineering: `engineering@${domain}`,
      security: `security@${domain}`,
      escalation: `oncall@${domain}`,
    },
    routing: {
      incident: RESPONSIBILITY_TARGETS[0] ?? "",
      governance: RESPONSIBILITY_TARGETS[2] ?? "",
      billing: RESPONSIBILITY_TARGETS[3] ?? "",
    },
    timezone: "UTC",
    locale: "en-GB",
    minSeverity: "P2",
    escalateAfter: "15 minutes",
    branding: "Scrubbe default",
    digest: "Weekly",
    categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id !== "mkt"])) as Record<CategoryId, boolean>,
  };
}

const CONTACTS: [keyof TenantProfile["contacts"], string][] = [
  ["admin", "Primary administrative contact"],
  ["engineering", "Engineering and operational contacts"],
  ["security", "Security and governance contacts"],
  ["escalation", "Incident escalation contact"],
];

const ROUTES: [keyof TenantProfile["routing"], string][] = [
  ["incident", "Incident notifications go to"],
  ["governance", "Governance and approval notifications go to"],
  ["billing", "Billing notifications go to"],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A tenant's communication settings, administered by Scrubbe personnel: who
 * receives what, when to escalate, and which categories are permitted. Tenants
 * never get template overrides, custom HTML or provider settings.
 */
export function TenantProfileModal({ tenant, onClose }: { tenant: ModuleRow; onClose: () => void }) {
  const { state, update } = useComms();
  const existing = state.tenantProfiles[tenant.id];
  const [profile, setProfile] = useState<TenantProfile>(() => structuredClone(existing ?? defaultProfile(tenant)));

  const set = <K extends keyof TenantProfile>(key: K, value: TenantProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const deliveries = deliveryLogs(state)
    .filter((log) => log.tenant === tenant.name)
    .slice(0, 3);
  const history = state.audit.filter((entry) => entry.resource === tenant.id).slice(0, 3);

  function save() {
    const contacts = Object.fromEntries(
      Object.entries(profile.contacts).map(([k, v]) => [k, v.trim()]),
    ) as TenantProfile["contacts"];
    if (!Object.values(contacts).every((value) => value.includes("@") && value.includes("."))) {
      return toastError(null, "Enter a valid email address for every contact.");
    }
    const categories = { ...profile.categories };
    CATEGORIES.forEach((c) => {
      if (isMandatoryCategory(c.id)) categories[c.id] = true;
    });
    update((draft) => {
      draft.tenantProfiles[tenant.id] = { ...profile, contacts, categories };
      const target = draft.workspaces.find((w) => w.id === tenant.id);
      if (target) target.cfg = "Custom";
      logChange(
        draft,
        "updated tenant profile",
        tenant.id,
        existing ? "Custom profile" : "Default profile",
        "Custom profile",
        "Tenant profile change by Scrubbe personnel",
      );
    });
    onClose();
    toastSuccess("Tenant profile saved (simulated).");
  }

  const select = (id: string, label: string, value: string, options: string[], onChange: (value: string) => void) => (
    <Field label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Tenant profile: ${tenant.name ?? tenant.id}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save tenant profile
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">
        Tenant identifier <span className="font-mono text-xs text-ink">{profile.tenantId}</span>
      </p>
      <Notice className="mt-3">
        Administered by authorised Scrubbe personnel. No template editing, overrides, custom HTML or provider settings are
        available for tenants.
      </Notice>

      <Section title="Contacts">
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACTS.map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`tp-${key}`}>
              <Input
                id={`tp-${key}`}
                type="email"
                value={profile.contacts[key]}
                onChange={(e) => set("contacts", { ...profile.contacts, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Notification responsibilities">
        <div className="grid gap-4 sm:grid-cols-3">
          {ROUTES.map(([key, label]) =>
            select(`tp-route-${key}`, label, profile.routing[key], RESPONSIBILITY_TARGETS, (value) =>
              set("routing", { ...profile.routing, [key]: value }),
            ),
          )}
        </div>
      </Section>

      <Section title="Locale and escalation (within platform limits)">
        <div className="grid gap-4 sm:grid-cols-2">
          {select("tp-tz", "Timezone", profile.timezone, TIMEZONES, (v) => set("timezone", v))}
          {select("tp-locale", "Locale", profile.locale, LOCALES, (v) => set("locale", v))}
          {select("tp-sev", "Minimum severity for operational incident emails", profile.minSeverity, ["P3", "P2", "P1"], (v) =>
            set("minSeverity", v),
          )}
          {select(
            "tp-esc",
            "Escalate unacknowledged critical incidents after",
            profile.escalateAfter,
            ["10 minutes", "15 minutes", "30 minutes"],
            (v) => set("escalateAfter", v),
          )}
          {select("tp-digest", "Informational digest", profile.digest, ["Off", "Daily", "Weekly"], (v) => set("digest", v))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          P0 incidents, security and account emails are always delivered under platform policy.
        </p>
      </Section>

      <Section title="Permitted notification categories">
        <div className="divide-y divide-line">
          {CATEGORIES.map((category) => {
            const mandatory = isMandatoryCategory(category.id);
            return (
              <div key={category.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {category.name}
                  {mandatory ? <span className="text-ink-faint"> (mandatory)</span> : null}
                </span>
                <Switch
                  checked={mandatory || profile.categories[category.id]}
                  disabled={mandatory}
                  label={category.name}
                  onChange={(next) => set("categories", { ...profile.categories, [category.id]: next })}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Branding">
        {select(
          "tp-brand",
          "Approved branding profile",
          profile.branding,
          ["Scrubbe default", "Approved tenant logo and accent colour"],
          (v) => set("branding", v),
        )}
        <p className="mt-2 text-xs text-ink-faint">
          Branding assets are verified and approved by Scrubbe. Templates are never customised per tenant.
        </p>
      </Section>

      <Section title="Delivery history">
        <div className="divide-y divide-line">
          {deliveries.length ? (
            deliveries.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-mono text-xs">
                  {log.id} {log.templateId}
                </span>
                <StatusBadge status={log.status} />
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-ink-faint">None</p>
          )}
        </div>
      </Section>

      <Section title="Tenant audit history">
        <div className="divide-y divide-line">
          {history.length ? (
            history.map((entry, i) => (
              <div key={`${entry.ts}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{entry.action}</span>
                <span className="text-xs text-ink-faint">{formatTimestamp(entry.ts)}</span>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-ink-faint">No changes recorded.</p>
          )}
        </div>
      </Section>
    </Modal>
  );
}
