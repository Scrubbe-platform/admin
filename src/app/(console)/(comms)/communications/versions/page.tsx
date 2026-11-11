"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, KeyValueList, Notice, StatusBadge } from "@/components/comms/parts";
import { VersionTable } from "@/components/comms/VersionTable";
import { Badge, Button, Card, Field, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { formatTimestamp, isHighRisk } from "@/lib/comms/catalog";
import { approveTemplate, findTemplate, publishTemplate, rejectTemplate } from "@/lib/comms/operations";
import { toastError, toastSuccess } from "@/lib/toast";

function VersionHistory() {
  const { state, update } = useComms();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("template") ?? "INC-02";
  const template = findTemplate(state, requested) ?? state.templates[0];
  const compareParam = params.get("compare");
  const [compareIndex, setCompareIndex] = useState<number | null>(compareParam === null ? null : Number(compareParam));
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [comment, setComment] = useState("");

  if (!template) return null;

  const approval = template.approval;
  const pending = approval?.status === "Pending";
  const compared = compareIndex === null ? undefined : template.versions[compareIndex];
  const predecessor = compareIndex === null ? undefined : template.versions[compareIndex + 1];

  return (
    <div>
      <CommsHeader
        title="Version History"
        description="Lifecycle: Draft, Validation, Pending Approval, Approved, Published. Published versions are immutable."
        actions={
          <Select
            value={template.id}
            aria-label="Template"
            className="w-auto max-w-[320px]"
            onChange={(e) => {
              setCompareIndex(null);
              router.replace(`/communications/versions?template=${e.target.value}`);
            }}
          >
            {state.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} – {t.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">Approval panel</h2>
          <p className="mb-3 mt-2 flex items-center gap-2">
            <StatusBadge status={template.status} />
            <span className="font-mono text-xs">{template.version}</span>
          </p>
          {approval ? (
            <KeyValueList
              items={[
                ["Submitted by", approval.by],
                ["Submitted at", formatTimestamp(approval.at)],
                ["Reviewer", approval.reviewer],
                ["Decision", <StatusBadge key="d" status={approval.status} />],
                ["Comments", approval.comment || "—"],
                ["Decided at", approval.decided ? formatTimestamp(approval.decided) : "—"],
              ]}
            />
          ) : (
            <p className="text-sm text-ink-muted">No approval request for this version.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={!pending}
              onClick={() => {
                // Separation of duties: whoever wrote a high-risk template can't approve it.
                if (approval && isHighRisk(template) && approval.reviewer.startsWith(template.by)) {
                  toastError(
                    null,
                    "Separation of duties: the author cannot approve a high-risk template. Assign a different reviewer.",
                  );
                  return;
                }
                setApproving(true);
              }}
            >
              Approve (simulated)
            </Button>
            <Button size="sm" variant="ghost" className="text-danger hover:text-danger" disabled={!pending} onClick={() => setRejecting(true)}>
              Reject (simulated)
            </Button>
            <Button
              size="sm"
              disabled={template.status !== "Approved"}
              onClick={() => {
                update((draft) => publishTemplate(draft, template.id));
                toastSuccess("Published (simulated). Production publication is backend-authorised.");
              }}
            >
              Publish (simulated)
            </Button>
          </div>
          <Notice className="mt-4">
            Approval and publication must be backend-authorised operations. These buttons only simulate them.
          </Notice>
        </Card>

        <Card className="p-5">
          {compared ? (
            <>
              <h2 className="text-base font-semibold text-ink">
                Compare {compared.version} with {predecessor?.version ?? "previous"}
              </h2>
              <div className="mt-2 divide-y divide-line">
                {compared.changes.map((c, i) => (
                  <div key={i} className="py-2.5 text-sm">
                    <Badge tone="info">{c.area} changed</Badge>
                    <p className="mt-1.5">
                      <span className="text-ink-faint">Before:</span> <span className="font-mono text-xs">{c.from}</span>
                    </p>
                    <p>
                      <span className="text-ink-faint">After:</span>{" "}
                      <span className="font-mono text-xs text-live">{c.to}</span>
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-ink">Compare versions</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Select Compare on a version to see subject, content, variable, trigger, recipient and layout changes against
                its predecessor.
              </p>
            </>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-7 text-base font-semibold text-ink">Versions</h2>
      <VersionTable template={template} onCompare={setCompareIndex} />

      {approving ? (
        <Modal
          open
          onClose={() => setApproving(false)}
          title={`Approve ${template.id} ${template.version}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setApproving(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const note = comment.trim();
                  update((draft) => approveTemplate(draft, template.id, note));
                  setApproving(false);
                  setComment("");
                  toastSuccess("Approved (simulated). Publication is a separate action.");
                }}
              >
                Approve (simulated)
              </Button>
            </>
          }
        >
          <Field label="Reviewer comment" htmlFor="approve-comment">
            <Textarea id="approve-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
          </Field>
          <p className="mt-3 text-sm text-ink-muted">Approval is separate from publication. A timestamp is recorded.</p>
        </Modal>
      ) : null}

      {rejecting ? (
        <Modal
          open
          onClose={() => setRejecting(false)}
          title="Reject version"
          footer={
            <>
              <Button variant="ghost" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = comment.trim();
                  if (!reason) return toastError(null, "Add a comment explaining the rejection.");
                  update((draft) => rejectTemplate(draft, template.id, reason));
                  setRejecting(false);
                  setComment("");
                  toastSuccess("Rejected (simulated). Returned to draft.");
                }}
              >
                Reject version
              </Button>
            </>
          }
        >
          <Field label="Reviewer comment" htmlFor="reject-comment" required>
            <Textarea id="reject-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}

export default function VersionHistoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VersionHistory />
    </Suspense>
  );
}
