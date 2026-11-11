"use client";

import Link from "next/link";
import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader } from "@/components/comms/parts";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { logAudit } from "@/lib/comms/operations";
import { toastSuccess } from "@/lib/toast";

export default function OrganisationPage() {
  const { state, update } = useComms();
  const [profile, setProfile] = useState(state.organisation);

  return (
    <div>
      <CommsHeader
        title="Organisation"
        description="Scrubbe Inc. internal organisation profile. Tenants are managed under Tenant Profiles."
      />

      <Card className="max-w-xl space-y-4 p-5">
        <h2 className="text-base font-semibold text-ink">Profile</h2>
        <Field label="Organisation name" htmlFor="org-name">
          <Input id="org-name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="Primary domain" htmlFor="org-domain">
          <Input id="org-domain" value={profile.domain} onChange={(e) => setProfile((p) => ({ ...p, domain: e.target.value }))} />
        </Field>
        <Field label="Platform region" htmlFor="org-region">
          <Select id="org-region" value={profile.region} onChange={(e) => setProfile((p) => ({ ...p, region: e.target.value }))}>
            {["EU (Frankfurt)", "US (Virginia)", "UK (London)"].map((region) => (
              <option key={region}>{region}</option>
            ))}
          </Select>
        </Field>
        <Field label="Environment" htmlFor="org-env">
          <Input id="org-env" value={profile.plan} disabled readOnly />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              update((draft) => {
                draft.organisation = profile;
                logAudit(draft, "updated organisation profile");
              });
              toastSuccess("Organisation profile saved.");
            }}
          >
            Save changes
          </Button>
          <Link href="/communications/tenants">
            <Button>Open Tenant Profiles</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
