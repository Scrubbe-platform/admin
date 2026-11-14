import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { seedComms } from "@/lib/comms/seed";
import type { AuditEntry, CommsState } from "@/types/comms";

/**
 * The Communications Centre library is stored by the Scrubbe API as six
 * versioned sections. The audit trail comes from the server's staff audit log
 * (written with the signed-in staff member as the actor), not from the client.
 */
export const COMMS_SECTIONS = ["templates", "triggers", "policies", "recipients", "design", "tenantProfiles"] as const;
export type CommsSection = (typeof COMMS_SECTIONS)[number];

interface ServerLibrary {
  initialised: boolean;
  sections: Partial<Record<CommsSection, unknown>>;
  versions: Record<CommsSection, number>;
}

interface ServerAuditEntry {
  adminEmail: string;
  summary: string;
  targetId: string | null;
  reason: string | null;
  metadata: { section?: string; previous?: string; next?: string };
  createdAt: string;
}

export interface LoadedComms {
  initialised: boolean;
  state: CommsState;
  versions: Record<CommsSection, number>;
}

function toAuditEntry(e: ServerAuditEntry): AuditEntry {
  return {
    ts: e.createdAt.slice(0, 16),
    actor: e.adminEmail,
    action: e.summary,
    resource: e.targetId && !COMMS_SECTIONS.includes(e.targetId as CommsSection) ? e.targetId : "",
    status: "Success",
    ...(e.metadata?.previous !== undefined ? { previous: e.metadata.previous } : {}),
    ...(e.metadata?.next !== undefined ? { next: e.metadata.next } : {}),
    ...(e.reason ? { reason: e.reason } : {}),
  };
}

export async function loadComms(): Promise<LoadedComms> {
  const [library, audit] = await Promise.all([
    request<ServerLibrary>({ method: "GET", url: ENDPOINTS.comms }),
    request<{ items: ServerAuditEntry[] }>({ method: "GET", url: `${ENDPOINTS.audit}?targetType=comms&limit=100` }),
  ]);
  // Structural defaults only (empty organisation/team lists etc.); the library itself comes from the server.
  const base = seedComms();
  const s = library.sections;
  const state: CommsState = {
    ...base,
    templates: (s.templates as CommsState["templates"]) ?? [],
    triggers: (s.triggers as CommsState["triggers"]) ?? [],
    policies: (s.policies as CommsState["policies"]) ?? [],
    recipients: (s.recipients as CommsState["recipients"]) ?? base.recipients,
    design: (s.design as CommsState["design"]) ?? base.design,
    tenantProfiles: (s.tenantProfiles as CommsState["tenantProfiles"]) ?? {},
    audit: audit.items.map(toAuditEntry),
    workspaces: [],
    team: [],
  };
  return { initialised: library.initialised, state, versions: library.versions };
}

/** First run: stores Scrubbe's starting template library on the server. */
export async function initialiseComms(): Promise<void> {
  const seeded = seedComms();
  await request({
    method: "POST",
    url: `${ENDPOINTS.comms}/initialise`,
    data: {
      sections: {
        templates: seeded.templates,
        triggers: seeded.triggers,
        policies: seeded.policies,
        recipients: seeded.recipients,
        design: seeded.design,
        tenantProfiles: {},
      },
    },
  });
}

export async function saveSection(section: CommsSection, value: unknown, version: number, audit: AuditEntry[]) {
  return request<{ section: CommsSection; version: number }>({
    method: "PUT",
    url: `${ENDPOINTS.comms}/${section}`,
    data: {
      value,
      version,
      audit: audit.slice(0, 50).map((a) => ({
        action: a.action.slice(0, 120),
        resource: (a.resource ?? "").slice(0, 200),
        ...(a.previous !== undefined ? { previous: String(a.previous).slice(0, 500) } : {}),
        ...(a.next !== undefined ? { next: String(a.next).slice(0, 500) } : {}),
        ...(a.reason ? { reason: a.reason.slice(0, 1000) } : {}),
      })),
    },
  });
}
