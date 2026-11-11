"use client";

import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { NotificationFlow } from "@/components/comms/NotificationFlow";
import { CommsHeader, Notice, StatusBadge, Switch, TemplateLink } from "@/components/comms/parts";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { RECIPIENT_RULES, daysAgo } from "@/lib/comms/catalog";
import { findTemplate, logAudit, logChange } from "@/lib/comms/operations";
import { toastSuccess } from "@/lib/toast";
import type { Trigger } from "@/types/comms";

export default function EventMappingPage() {
  const { state, update } = useComms();
  const [editing, setEditing] = useState<Trigger | null>(null);

  const events = new Set(state.triggers.map((t) => t.event)).size;
  const templates = new Set(state.triggers.map((t) => t.templateId)).size;
  const mappings = [...state.triggers].sort((a, b) => a.event.localeCompare(b.event));

  function toggle(trigger: Trigger, enabled: boolean) {
    update((draft) => {
      const target = draft.triggers.find((t) => t.id === trigger.id);
      if (!target) return;
      target.enabled = enabled;
      logAudit(draft, `${enabled ? "enabled" : "disabled"} trigger ${target.event}`, target.templateId);
    });
    toastSuccess(`Trigger ${enabled ? "enabled" : "disabled"} (demonstration).`);
  }

  return (
    <div>
      <CommsHeader
        title="Event Mapping"
        description="Event catalogue and notification mappings. Each mapping links a domain event and use case to an approved master template and the policy that governs delivery."
      />
      <NotificationFlow />
      <Notice className="mb-4">
        {events} events | {state.triggers.length} notification use cases | {templates} master templates. One event can trigger
        several use cases, and policies may suppress or defer any of them. Mappings configured here never bypass backend
        policy enforcement.
      </Notice>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              {["Event", "Use case", "Master template", "Policy", "Status", "Last triggered", ""].map((heading) => (
                <th key={heading} className="px-3 py-2.5 font-normal">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {mappings.map((trigger) => {
              const template = findTemplate(state, trigger.templateId);
              return (
                <tr key={trigger.id}>
                  <td className="px-3 py-2.5 font-mono text-xs">{trigger.event}</td>
                  <td className="px-3 py-2.5">{trigger.useCase}</td>
                  <td className="px-3 py-2.5">
                    <TemplateLink template={template} id={trigger.templateId} />{" "}
                    {template ? <span className="font-mono text-xs text-ink-faint">{template.version}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">{trigger.policy}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={trigger.enabled ? "Enabled" : "Disabled"} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{trigger.last}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <Switch checked={trigger.enabled} onChange={(next) => toggle(trigger, next)} label={`Enable ${trigger.name}`} />
                      <Button size="sm" onClick={() => setEditing(trigger)}>
                        Details
                      </Button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {editing ? <MappingDetails key={editing.id} trigger={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function MappingDetails({ trigger, onClose }: { trigger: Trigger; onClose: () => void }) {
  const { state, update } = useComms();
  const [policy, setPolicy] = useState(trigger.policy);
  const [rule, setRule] = useState(trigger.rule);
  const [condition, setCondition] = useState(trigger.condition);
  const template = findTemplate(state, trigger.templateId);

  const policyNames = [...new Set([trigger.policy, ...state.policies.map((p) => p.name ?? "")])].filter(Boolean);
  const rules = [...new Set([trigger.rule, ...RECIPIENT_RULES])];

  const chain: [string, string][] = [
    ["1. Domain event", trigger.event],
    ["2. Notification use case", trigger.useCase],
    ["3. Master template", template ? `${template.id} ${template.name} ${template.version}` : trigger.templateId],
    ["4. Notification policy", trigger.policy],
    ["5. Delivery", "Backend resolves tenant recipients, renders and queues (not live)"],
  ];

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={trigger.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              update((draft) => {
                const target = draft.triggers.find((t) => t.id === trigger.id);
                if (!target) return;
                logChange(
                  draft,
                  `updated event mapping ${target.event}`,
                  target.templateId,
                  `${target.policy} | ${target.rule}`,
                  `${policy} | ${rule}`,
                  "Mapping change via Communications Centre",
                );
                target.policy = policy;
                target.rule = rule;
                target.condition = condition;
              });
              onClose();
              toastSuccess("Mapping saved (simulated). Backend policy still applies.");
            }}
          >
            Save mapping
          </Button>
        </>
      }
    >
      <div className="divide-y divide-line">
        {chain.map(([step, value]) => (
          <div key={step} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="text-ink-muted">{step}</span>
            <span className="text-right text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <Field label="Policy" htmlFor="map-policy">
          <Select id="map-policy" value={policy} onChange={(e) => setPolicy(e.target.value)}>
            {policyNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Recipient rule" htmlFor="map-rule">
          <Select id="map-rule" value={rule} onChange={(e) => setRule(e.target.value)}>
            {rules.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Condition" htmlFor="map-cond">
          <Input id="map-cond" value={condition} onChange={(e) => setCondition(e.target.value)} />
        </Field>
      </div>

      <h3 className="mb-1 mt-5 text-sm font-semibold text-ink">Trigger history</h3>
      <div className="divide-y divide-line">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="font-mono text-xs">{trigger.event}</span>
            <span className="flex items-center gap-2 text-xs text-ink-faint">
              {daysAgo(i + 1)} 0{i + 6}:1{i} UTC <StatusBadge status="Success" />
            </span>
          </div>
        ))}
      </div>
      <Notice className="mt-4">Recipient resolution and policy evaluation are backend responsibilities.</Notice>
    </Modal>
  );
}
