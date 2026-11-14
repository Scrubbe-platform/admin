"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";

import { PageBody, ReasonDialog, relative, StatusBadge } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { ErrorState, Modal, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchTeam, inviteStaff, resendStaffInvite, setStaffRole, staffAction, unlockStaff, type StaffMember } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";
import { displayName, STAFF_ROLE_DESCRIPTION, STAFF_ROLE_LABEL, STAFF_ROLES, type StaffRole } from "@/types/user";

export default function TeamPage() {
  const { user, can } = useCurrentUser();
  const manage = can("staff.manage");
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["team"], queryFn: fetchTeam });
  const [inviting, setInviting] = useState(false);
  const [dialog, setDialog] = useState<{ member: StaffMember; action: "deactivate" | "reactivate" | "reset-mfa" } | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["team"] });
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: (e) => toastError(e, "That didn't go through."),
  });

  return (
    <>
      <PageHeader
        title="Team & access"
        description="Scrubbe staff who can sign in to this console. Every account uses two-factor authentication; roles decide what each person can do."
        actions={manage ? <Button variant="primary" onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" /> Invite</Button> : null}
      />
      <PageBody>
        <Card>
          {team.isLoading ? (
            <TableSkeleton rows={4} />
          ) : team.isError ? (
            <ErrorState error={team.error} onRetry={() => team.refetch()} />
          ) : (
            <ul className="divide-y divide-line">
              {team.data!.map((m) => {
                const self = m.id === user?.id;
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {displayName(m)} {self ? <span className="text-xs text-ink-faint">(you)</span> : null}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {m.email} · {m.invitePending ? "invite sent, not accepted" : m.inviteExpired ? "invite expired" : `last sign-in ${relative(m.lastLogin)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!m.isActive ? <Badge>Deactivated</Badge> : m.invitePending ? <Badge tone="info">Invited</Badge> : m.inviteExpired ? <Badge tone="caution">Invite expired</Badge> : <StatusBadge status="ACTIVE" />}
                      {m.locked ? <Badge tone="danger">Locked</Badge> : null}
                      {m.isActive && !m.invitePending && !m.inviteExpired ? (m.mfaEnabled ? <Badge tone="live">2FA</Badge> : <Badge tone="caution">No 2FA yet</Badge>) : null}
                      {manage && !self ? (
                        <Select
                          aria-label={`Role for ${m.email}`}
                          className="h-8 w-36 text-xs"
                          value={m.role}
                          onChange={(e) => mutate.mutate(() => setStaffRole(m.id, e.target.value as StaffRole), { onSuccess: () => toastSuccess("Role changed") })}
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone="signal">{STAFF_ROLE_LABEL[m.role]}</Badge>
                      )}
                      {manage && !self ? (
                        <>
                          {m.invitePending || m.inviteExpired ? (
                            <Button size="sm" variant="ghost" onClick={() => mutate.mutate(() => resendStaffInvite(m.id), { onSuccess: () => toastSuccess("Invite resent") })}>Resend invite</Button>
                          ) : null}
                          {m.locked ? <Button size="sm" variant="ghost" onClick={() => mutate.mutate(() => unlockStaff(m.id), { onSuccess: () => toastSuccess("Unlocked") })}>Unlock</Button> : null}
                          {m.mfaEnabled ? <Button size="sm" variant="ghost" onClick={() => setDialog({ member: m, action: "reset-mfa" })}>Reset 2FA</Button> : null}
                          {m.isActive ? (
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDialog({ member: m, action: "deactivate" })}>Deactivate</Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setDialog({ member: m, action: "reactivate" })}>Reactivate</Button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-sm text-ink">What each role can do</h2>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {STAFF_ROLES.map((r) => (
              <div key={r} className="text-sm">
                <dt className="text-ink">{STAFF_ROLE_LABEL[r]}</dt>
                <dd className="text-xs text-ink-muted">{STAFF_ROLE_DESCRIPTION[r]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </PageBody>

      {inviting ? <InviteDialog onClose={() => setInviting(false)} onDone={() => { setInviting(false); refresh(); }} /> : null}
      {dialog ? (
        <ReasonDialog
          open
          onClose={() => setDialog(null)}
          title={dialog.action === "deactivate" ? `Deactivate ${dialog.member.email}?` : dialog.action === "reactivate" ? `Reactivate ${dialog.member.email}?` : `Reset two-factor for ${dialog.member.email}?`}
          danger={dialog.action !== "reactivate"}
          confirmLabel={dialog.action === "deactivate" ? "Deactivate" : dialog.action === "reactivate" ? "Reactivate" : "Reset 2FA"}
          loading={mutate.isPending}
          body={
            dialog.action === "deactivate"
              ? "Their sessions end immediately and they can't sign in. Their past actions stay in the audit log."
              : dialog.action === "reactivate"
                ? "They can sign in again with their existing password and authenticator."
                : "Their authenticator is removed and their sessions end. They set up a new one at their next sign-in."
          }
          onConfirm={(reason) =>
            mutate.mutate(() => staffAction(dialog.member.id, dialog.action, reason), {
              onSuccess: () => {
                toastSuccess("Done");
                setDialog(null);
              },
            })
          }
        />
      ) : null}
    </>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ email: "", firstName: "", lastName: "", role: "SUPPORT" as StaffRole });
  const invite = useMutation({
    mutationFn: () => inviteStaff(f),
    onSuccess: () => {
      toastSuccess(`Invite emailed to ${f.email}`);
      onDone();
    },
    onError: (e) => toastError(e, "Couldn't send the invite."),
  });
  const valid = /^\S+@\S+\.\S+$/.test(f.email) && f.firstName.trim() && f.lastName.trim();
  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a staff member"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} loading={invite.isPending} onClick={() => invite.mutate()}>Send invite</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">They get a single-use link (valid 72 hours) to choose a password, then set up two-factor authentication at first sign-in.</p>
        <Field label="Work email" htmlFor="ie" required>
          <Input id="ie" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="ifn" required>
            <Input id="ifn" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          </Field>
          <Field label="Last name" htmlFor="iln" required>
            <Input id="iln" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Role" htmlFor="ir" hint={STAFF_ROLE_DESCRIPTION[f.role]}>
          <Select id="ir" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
