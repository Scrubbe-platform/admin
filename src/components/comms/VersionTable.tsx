"use client";

import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { ConfirmDialog, StatusBadge } from "@/components/comms/parts";
import { Button, Card } from "@/components/ui/primitives";
import { rollbackTemplate } from "@/lib/comms/operations";
import { toastSuccess } from "@/lib/toast";
import type { EmailTemplate, TemplateVersion } from "@/types/comms";

/** Older published versions can be rolled back to; the current one can't. */
function canRollBack(version: TemplateVersion, index: number): boolean {
  return index > 0 && (version.status === "Superseded" || version.status === "Published");
}

export function VersionTable({ template, onCompare }: { template: EmailTemplate; onCompare: (index: number) => void }) {
  const { update } = useComms();
  const [rollingBack, setRollingBack] = useState<TemplateVersion | null>(null);

  return (
    <>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              {["Version", "Author", "Date", "Changes", "Publication", ""].map((heading) => (
                <th key={heading} className="px-3 py-2.5 font-normal">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {template.versions.map((version, i) => (
              <tr key={`${version.version}-${i}`}>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {version.version}
                  {template.live === version.version ? <span className="ml-1.5 font-sans text-ink-faint">(live)</span> : null}
                </td>
                <td className="px-3 py-2.5">{version.by}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{version.date}</td>
                <td className="px-3 py-2.5 text-ink-muted">{version.note}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={version.status} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex gap-1.5">
                    <Button size="sm" disabled={!version.changes.length} onClick={() => onCompare(i)}>
                      Compare
                    </Button>
                    <Button size="sm" disabled={!canRollBack(version, i)} onClick={() => setRollingBack(version)}>
                      Roll back
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {rollingBack ? (
        <ConfirmDialog
          title={`Roll back ${template.id} to ${rollingBack.version}?`}
          body={`Future deliveries will use ${rollingBack.version}. Historical delivery records are not changed and keep the version used at the time. In production this is a backend-authorised operation.`}
          confirmLabel="Roll back (simulated)"
          onClose={() => setRollingBack(null)}
          onConfirm={() => {
            const version = rollingBack.version;
            update((draft) => rollbackTemplate(draft, template.id, version));
            setRollingBack(null);
            toastSuccess(`Future deliveries will use ${version} (simulated).`);
          }}
        />
      ) : null}
    </>
  );
}
