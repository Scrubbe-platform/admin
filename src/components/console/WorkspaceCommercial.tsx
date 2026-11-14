"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatDate, KeyValues, money, ReasonDialog, Section, StatusBadge } from "@/components/console/kit";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ErrorState, Modal, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  createAgreement,
  createInvoice,
  createQuotation,
  decideQuotation,
  deleteQuotation,
  fetchDocumentLink,
  fetchWorkspaceBilling,
  issueInvoice,
  issueQuotation,
  recordPayment,
  reversePayment,
  updateAgreement,
  updateInvoice,
  updateQuotation,
  voidInvoice,
  type Agreement,
  type AgreementInput,
  type LineItem,
  type StaffInvoice,
  type StaffQuotation,
} from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const dateOnly = (v: string | null) => (v ? v.slice(0, 10) : "");

async function openDocument(kind: "quotation" | "invoice", id: string) {
  // Open the tab synchronously so pop-up blockers allow it, then point it at the signed link.
  const tab = window.open("", "_blank");
  try {
    const { url } = await fetchDocumentLink(kind, id);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    toastError(e, "Couldn't open the document.");
  }
}

export function WorkspaceCommercial({ businessId }: { businessId: string }) {
  const { can } = useCurrentUser();
  const write = can("billing.write");
  const qc = useQueryClient();
  const key = ["workspace-billing", businessId];
  const billing = useQuery({ queryKey: key, queryFn: () => fetchWorkspaceBilling(businessId) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["workspace", businessId] });
    void qc.invalidateQueries({ queryKey: ["billing-overview"] });
  };

  const [agreementEdit, setAgreementEdit] = useState<Agreement | "new" | null>(null);
  const [docEdit, setDocEdit] = useState<{ kind: "quotation" | "invoice"; record?: StaffQuotation | StaffInvoice; fromQuotation?: StaffQuotation } | null>(null);
  const [paying, setPaying] = useState<StaffInvoice | null>(null);
  const [voiding, setVoiding] = useState<StaffInvoice | null>(null);
  const [reversing, setReversing] = useState<{ id: string; reference: string } | null>(null);

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => toastError(e, "That didn't go through."),
  });
  const run = (fn: () => Promise<unknown>, done: string) => act.mutate(fn, { onSuccess: () => toastSuccess(done) });

  if (billing.isError) return <ErrorState error={billing.error} onRetry={() => billing.refetch()} />;
  if (!billing.data) return <TableSkeleton rows={5} />;
  const b = billing.data;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Billing details" description="Maintained by the workspace in Settings → Billing.">
          <KeyValues
            rows={[
              ["Legal entity", (b.details.legalEntityName as string) ?? "—"],
              ["Registered address", (b.details.registeredAddress as string) ?? "—"],
              ["Tax registration", (b.details.taxRegistration as string) ?? "—"],
              ["Invoice email", b.preferences.invoiceEmail ?? "—"],
              ["Currency", b.preferences.currency ?? "Not set"],
              ["Accounts payable", b.contacts.accountsPayable ? `${b.contacts.accountsPayable.name ?? ""} ${b.contacts.accountsPayable.email ?? ""}`.trim() : "—"],
              ["Commercial approver", b.contacts.commercialApprover ? `${b.contacts.commercialApprover.name ?? ""} ${b.contacts.commercialApprover.email ?? ""}`.trim() : "—"],
            ]}
          />
        </Section>
        <Section
          title="Agreements"
          actions={write ? <Button size="sm" onClick={() => setAgreementEdit("new")}><Plus className="h-3.5 w-3.5" /> Agreement</Button> : undefined}
        >
          {b.agreements.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">No commercial agreement on record.</p>
          ) : (
            <ul className="divide-y divide-line">
              {b.agreements.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="text-ink">
                      <span className="font-mono text-xs">{a.reference}</span> · {a.pricingModel}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {a.term ?? "No term"} · {formatDate(a.effectiveDate)} → {formatDate(a.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {write ? <Button size="sm" variant="ghost" onClick={() => setAgreementEdit(a)}>Edit</Button> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Quotations"
        description="Drafts are only visible here. Issuing sends the workspace an email and shows it in their billing."
        actions={write ? <Button size="sm" onClick={() => setDocEdit({ kind: "quotation" })}><Plus className="h-3.5 w-3.5" /> Quotation</Button> : undefined}
      >
        {b.quotations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">No quotations.</p>
        ) : (
          <ul className="divide-y divide-line">
            {b.quotations.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="text-ink">
                    <span className="font-mono text-xs">{q.reference}</span> · {money(q.amount, q.currency)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {q.issuedAt ? `Issued ${formatDate(q.issuedAt)}` : "Draft"} · valid until {formatDate(q.validUntil)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={q.status} />
                  <Button size="sm" variant="ghost" onClick={() => openDocument("quotation", q.id)} aria-label={`Open ${q.reference} PDF`}>
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                  {write && q.storedStatus === "DRAFT" ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setDocEdit({ kind: "quotation", record: q })}>Edit</Button>
                      <Button size="sm" variant="primary" loading={act.isPending} onClick={() => run(() => issueQuotation(q.id), `${q.reference} issued and emailed`)}>Issue</Button>
                      <Button size="sm" variant="ghost" aria-label="Delete draft" onClick={() => run(() => deleteQuotation(q.id), "Draft deleted")}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : null}
                  {write && q.storedStatus === "ISSUED" ? (
                    <>
                      <Button size="sm" onClick={() => run(() => decideQuotation(q.id, "ACCEPTED"), `${q.reference} marked accepted`)}>Accepted</Button>
                      <Button size="sm" variant="ghost" onClick={() => run(() => decideQuotation(q.id, "DECLINED"), `${q.reference} marked declined`)}>Declined</Button>
                    </>
                  ) : null}
                  {write && q.storedStatus === "ACCEPTED" ? (
                    <Button size="sm" variant="primary" onClick={() => setDocEdit({ kind: "invoice", fromQuotation: q })}>Invoice it</Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Invoices"
        description="Overdue is worked out from the due date, so it is always current."
        actions={write ? <Button size="sm" onClick={() => setDocEdit({ kind: "invoice" })}><Plus className="h-3.5 w-3.5" /> Invoice</Button> : undefined}
      >
        {b.invoices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">No invoices.</p>
        ) : (
          <ul className="divide-y divide-line">
            {b.invoices.map((i) => (
              <li key={i.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-ink">
                      <span className="font-mono text-xs">{i.reference}</span> · {money(i.amount, i.currency)}
                      {i.balanceDue > 0 && i.storedStatus !== "DRAFT" && i.storedStatus !== "VOID" ? (
                        <span className="text-ink-muted"> · {money(i.balanceDue, i.currency)} due</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {i.invoiceDate ? `Issued ${formatDate(i.invoiceDate)}` : "Draft"} · due {formatDate(i.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={i.status} />
                    <Button size="sm" variant="ghost" onClick={() => openDocument("invoice", i.id)} aria-label={`Open ${i.reference} PDF`}>
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </Button>
                    {write && i.storedStatus === "DRAFT" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setDocEdit({ kind: "invoice", record: i })}>Edit</Button>
                        <Button size="sm" variant="primary" loading={act.isPending} onClick={() => run(() => issueInvoice(i.id), `${i.reference} issued and emailed`)}>Issue</Button>
                      </>
                    ) : null}
                    {write && (i.storedStatus === "ISSUED" || i.storedStatus === "PART_PAID") ? (
                      <Button size="sm" variant="primary" onClick={() => setPaying(i)}>Record payment</Button>
                    ) : null}
                    {write && i.storedStatus !== "VOID" && i.payments.length === 0 ? (
                      <Button size="sm" variant="ghost" onClick={() => setVoiding(i)}>Void</Button>
                    ) : null}
                  </div>
                </div>
                {i.payments.length ? (
                  <ul className="mt-2 space-y-1 border-l-2 border-line pl-3">
                    {i.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                        <span>
                          {money(p.amount, p.currency)} by {p.method} on {formatDate(p.receivedAt)} · <span className="font-mono">{p.reference}</span>
                        </span>
                        {write ? (
                          <button type="button" className="text-ink-faint hover:text-danger" onClick={() => setReversing({ id: p.id, reference: p.reference })}>
                            Reverse
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {agreementEdit ? (
        <AgreementDialog
          agreement={agreementEdit === "new" ? null : agreementEdit}
          onClose={() => setAgreementEdit(null)}
          onSave={async (input) => {
            if (agreementEdit === "new") await createAgreement(businessId, input);
            else await updateAgreement(agreementEdit.id, input);
            toastSuccess("Agreement saved");
            setAgreementEdit(null);
            refresh();
          }}
        />
      ) : null}
      {docEdit ? (
        <DocumentDialog
          kind={docEdit.kind}
          record={docEdit.record}
          fromQuotation={docEdit.fromQuotation}
          defaultCurrency={b.preferences.currency ?? "USD"}
          onClose={() => setDocEdit(null)}
          onSave={async (input) => {
            if (docEdit.kind === "quotation") {
              const data = { currency: input.currency, lineItems: input.lineItems, taxRate: input.taxRate, validUntil: input.date || null, notes: input.notes };
              if (docEdit.record) await updateQuotation(docEdit.record.id, data);
              else await createQuotation(businessId, data);
            } else {
              const data = { currency: input.currency, lineItems: input.lineItems, taxRate: input.taxRate, dueDate: input.date, quotationId: docEdit.fromQuotation?.id ?? (docEdit.record as StaffInvoice | undefined)?.quotationId ?? null, notes: input.notes };
              if (docEdit.record) await updateInvoice(docEdit.record.id, data);
              else await createInvoice(businessId, data);
            }
            toastSuccess("Saved as a draft. Issue it when it's ready.");
            setDocEdit(null);
            refresh();
          }}
        />
      ) : null}
      {paying ? (
        <PaymentDialog
          invoice={paying}
          onClose={() => setPaying(null)}
          onSave={async (data) => {
            await recordPayment(paying.id, data);
            toastSuccess("Payment recorded");
            setPaying(null);
            refresh();
          }}
        />
      ) : null}
      <ReasonDialog
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        title={`Void ${voiding?.reference ?? "invoice"}?`}
        danger
        confirmLabel="Void invoice"
        loading={act.isPending}
        body="A void invoice stays on record but is removed from the workspace's billing and from receivables."
        onConfirm={(reason) => act.mutate(() => voidInvoice(voiding!.id, reason), { onSuccess: () => { toastSuccess("Invoice voided"); setVoiding(null); } })}
      />
      <ReasonDialog
        open={Boolean(reversing)}
        onClose={() => setReversing(null)}
        title={`Reverse payment ${reversing?.reference ?? ""}?`}
        danger
        confirmLabel="Reverse payment"
        loading={act.isPending}
        body="The payment is removed and the invoice's balance goes back up. Use this for chargebacks and mistakes."
        onConfirm={(reason) => act.mutate(() => reversePayment(reversing!.id, reason), { onSuccess: () => { toastSuccess("Payment reversed"); setReversing(null); } })}
      />
    </div>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function useSaving() {
  const [saving, setSaving] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
    } catch (e) {
      toastError(e, "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };
  return { saving, run };
}

function AgreementDialog({ agreement, onClose, onSave }: { agreement: Agreement | null; onClose: () => void; onSave: (input: AgreementInput) => Promise<void> }) {
  const [f, setF] = useState<AgreementInput>({
    pricingModel: agreement?.pricingModel ?? "",
    term: agreement?.term ?? "12 months",
    effectiveDate: dateOnly(agreement?.effectiveDate ?? null) || today(),
    expiresAt: dateOnly(agreement?.expiresAt ?? null) || null,
    status: agreement?.status ?? "PENDING",
    notes: agreement?.notes ?? null,
  });
  const { saving, run } = useSaving();
  return (
    <Modal
      open
      onClose={onClose}
      title={agreement ? `Edit ${agreement.reference}` : "New commercial agreement"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={f.pricingModel.trim().length < 2} onClick={() => run(() => onSave(f))}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Pricing model" htmlFor="pm" required>
          <Input id="pm" value={f.pricingModel} onChange={(e) => setF({ ...f, pricingModel: e.target.value })} placeholder="Platform fee + per seat" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Term" htmlFor="term">
            <Input id="term" value={f.term ?? ""} onChange={(e) => setF({ ...f, term: e.target.value || null })} />
          </Field>
          <Field label="Status" htmlFor="st">
            <Select id="st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AgreementInput["status"] })}>
              <option value="PENDING">Pending signature</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
            </Select>
          </Field>
          <Field label="Effective" htmlFor="eff">
            <Input id="eff" type="date" value={f.effectiveDate ?? ""} onChange={(e) => setF({ ...f, effectiveDate: e.target.value || null })} />
          </Field>
          <Field label="Expires" htmlFor="exp">
            <Input id="exp" type="date" value={f.expiresAt ?? ""} onChange={(e) => setF({ ...f, expiresAt: e.target.value || null })} />
          </Field>
        </div>
        <Field label="Internal notes" htmlFor="notes" hint="Not shown to the workspace">
          <Textarea id="notes" rows={2} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value || null })} />
        </Field>
      </div>
    </Modal>
  );
}

interface DocInput {
  currency: string;
  lineItems: LineItem[];
  taxRate: number;
  date: string;
  notes: string | null;
}

function DocumentDialog({
  kind,
  record,
  fromQuotation,
  defaultCurrency,
  onClose,
  onSave,
}: {
  kind: "quotation" | "invoice";
  record?: StaffQuotation | StaffInvoice;
  fromQuotation?: StaffQuotation;
  defaultCurrency: string;
  onClose: () => void;
  onSave: (input: DocInput) => Promise<void>;
}) {
  const source = record ?? fromQuotation;
  const initialRate = source && source.subtotal > 0 ? Math.round((source.taxAmount / source.subtotal) * 10_000) / 100 : 0;
  const [currency, setCurrency] = useState(source?.currency ?? defaultCurrency);
  const [items, setItems] = useState<LineItem[]>(source?.lineItems?.length ? source.lineItems : [{ description: "", quantity: 1, unitAmount: 0 }]);
  const [taxRate, setTaxRate] = useState(initialRate);
  const [date, setDate] = useState(
    kind === "quotation" ? dateOnly((record as StaffQuotation | undefined)?.validUntil ?? null) || plusDays(30) : dateOnly((record as StaffInvoice | undefined)?.dueDate ?? null) || plusDays(30),
  );
  const [notes, setNotes] = useState<string | null>(record?.notes ?? null);
  const { saving, run } = useSaving();

  useEffect(() => {
    if (fromQuotation) setCurrency(fromQuotation.currency);
  }, [fromQuotation]);

  const totals = useMemo(() => {
    const subtotal = Math.round(items.reduce((t, li) => t + (li.quantity || 0) * (li.unitAmount || 0), 0) * 100) / 100;
    const tax = Math.round(subtotal * taxRate) / 100;
    return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
  }, [items, taxRate]);

  const valid = items.length > 0 && items.every((li) => li.description.trim() && li.quantity > 0 && li.unitAmount >= 0) && /^[A-Z]{3}$/.test(currency) && (kind === "quotation" || Boolean(date));
  const setItem = (i: number, patch: Partial<LineItem>) => setItems(items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={record ? `Edit ${record.reference}` : fromQuotation ? `Invoice from ${fromQuotation.reference}` : kind === "quotation" ? "New quotation" : "New invoice"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!valid} onClick={() => run(() => onSave({ currency, lineItems: items, taxRate, date, notes }))}>
            Save draft
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Currency" htmlFor="cur" required>
            <Input id="cur" value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Tax rate (%)" htmlFor="tax">
            <Input id="tax" type="number" min={0} max={100} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </Field>
          <Field label={kind === "quotation" ? "Valid until" : "Due date"} htmlFor="date" required={kind === "invoice"}>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm text-ink">Line items</p>
          <div className="space-y-2">
            {items.map((li, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-6" placeholder="Description" value={li.description} onChange={(e) => setItem(i, { description: e.target.value })} aria-label="Description" />
                <Input className="col-span-2" type="number" min={0} step="0.01" value={li.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} aria-label="Quantity" />
                <Input className="col-span-3" type="number" min={0} step="0.01" value={li.unitAmount} onChange={(e) => setItem(i, { unitAmount: Number(e.target.value) })} aria-label="Unit amount" />
                <Button className="col-span-1" size="sm" variant="ghost" aria-label="Remove line" disabled={items.length === 1} onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setItems([...items, { description: "", quantity: 1, unitAmount: 0 }])}>
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
        </div>

        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span className="tabular-nums">{money(totals.subtotal, currency)}</span></div>
          <div className="flex justify-between text-ink-muted"><span>Tax</span><span className="tabular-nums">{money(totals.tax, currency)}</span></div>
          <div className="flex justify-between font-semibold text-ink"><span>Total</span><span className="tabular-nums">{money(totals.total, currency)}</span></div>
          <p className="text-2xs text-ink-faint">The server recalculates totals from the lines when you save.</p>
        </div>

        <Field label="Notes on the document" htmlFor="dnotes" hint="Printed on the PDF">
          <Textarea id="dnotes" rows={2} value={notes ?? ""} onChange={(e) => setNotes(e.target.value || null)} />
        </Field>
      </div>
    </Modal>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  onSave,
}: {
  invoice: StaffInvoice;
  onClose: () => void;
  onSave: (data: { amount: number; method: string; receivedAt: string; reference?: string; notes: string | null }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(invoice.balanceDue);
  const [method, setMethod] = useState("Bank transfer");
  const [receivedAt, setReceivedAt] = useState(today());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const { saving, run } = useSaving();
  const over = amount > invoice.balanceDue + 0.0001;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Record payment on ${invoice.reference}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!(amount > 0) || over || method.trim().length < 2}
            onClick={() => run(() => onSave({ amount, method, receivedAt, ...(reference.trim() ? { reference: reference.trim() } : {}), notes: notes.trim() || null }))}
          >
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          {money(invoice.balanceDue, invoice.currency)} still owed of {money(invoice.amount, invoice.currency)}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${invoice.currency})`} htmlFor="amt" error={over ? "More than the balance due" : undefined} required>
            <Input id="amt" type="number" min={0} step="0.01" value={amount} invalid={over} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Received" htmlFor="recv" required>
            <Input id="recv" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </Field>
          <Field label="Method" htmlFor="meth" required>
            <Input id="meth" value={method} onChange={(e) => setMethod(e.target.value)} />
          </Field>
          <Field label="Reference" htmlFor="ref" hint="Leave blank to number it">
            <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="pnotes">
          <Textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
