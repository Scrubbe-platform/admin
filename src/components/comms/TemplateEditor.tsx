"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { ActionMenu, ConfirmDialog, Notice } from "@/components/comms/parts";
import {
  EmailFrame,
  PreviewModal,
  SubmitModal,
  TestSendModal,
  ValidationList,
} from "@/components/comms/TemplateDialogs";
import { Badge, Button, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { SEVERITY_INFO, isMandatoryCategory } from "@/lib/comms/catalog";
import { duplicateTemplate, findTemplate, saveDraft, submitForApproval } from "@/lib/comms/operations";
import { renderEmail, sampleValues, substitute, validateTemplate } from "@/lib/comms/render";
import { makeBlock, newBlockId, row } from "@/lib/comms/seed";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";
import type { BlockProps, BlockType, EmailBlock, EmailTemplate } from "@/types/comms";

type FieldKind = "text" | "textarea" | "number" | "color" | "select" | "enumVar" | "urlVar" | "checkbox";
type FieldSpec = [key: string, label: string, kind: FieldKind, options?: string[]];

const ALIGN = ["left", "center", "right"];

const SCHEMA: Record<BlockType, FieldSpec[]> = {
  header: [
    ["logo", "Wordmark text", "text"],
    ["align", "Alignment", "select", ALIGN],
    ["bg", "Background", "color"],
    ["pad", "Padding (px)", "number"],
  ],
  eyebrow: [
    ["text", "Text", "text"],
    ["size", "Font size (px)", "number"],
    ["color", "Colour", "color"],
  ],
  heading: [
    ["text", "Heading text", "text"],
    ["size", "Font size (px)", "number"],
    ["weight", "Font weight", "select", ["400", "600", "700"]],
    ["align", "Alignment", "select", ALIGN],
    ["color", "Text colour", "color"],
  ],
  text: [
    ["text", "Content (variables allowed, HTML is escaped)", "textarea"],
    ["size", "Font size (px)", "number"],
    ["color", "Colour", "color"],
  ],
  severity: [
    ["v", "Severity variable", "enumVar"],
    ["pre", "Label text", "text"],
  ],
  summary: [],
  impact: [
    ["text", "Content", "textarea"],
    ["cond", "Visibility condition", "select", ["when present", "always"]],
    ["fb", "Fallback text (when “always”)", "text"],
  ],
  details: [],
  cta: [
    ["label", "Button label", "text"],
    ["url", "Destination variable (URL)", "urlVar"],
    ["align", "Alignment", "select", ALIGN],
    ["width", "Width", "select", ["auto", "full"]],
  ],
  footer: [
    ["company", "Company name", "text"],
    ["legal", "Legal text", "textarea"],
    ["prefs", "Show preferences link", "checkbox"],
    ["unsub", "Show unsubscribe link", "checkbox"],
  ],
};

const HELP: Record<BlockType, string> = {
  header: "Brand header shown on every email.",
  eyebrow: "Short category label above the heading.",
  heading: "Main heading. Use one per email.",
  text: "Body copy. Insert variables from the panel below.",
  severity: "Maps P0–P3 to a labelled badge. Colour is never the only signal.",
  summary: "Key facts. Rows with an empty optional variable are hidden automatically.",
  impact: "Optional block. Hidden when its variable is empty, unless set to always show.",
  details: "Declaration metadata rows.",
  cta: "Links to an authenticated Scrubbe page. The URL is validated by the backend before sending.",
  footer: "Company and legal text. Mandatory operational emails cannot offer unsubscribe.",
};

const ADDABLE: [BlockType, string][] = [
  ["text", "Text"],
  ["summary", "Summary table"],
  ["impact", "Impact panel"],
  ["details", "Details table"],
  ["eyebrow", "Eyebrow"],
  ["cta", "Button"],
];

function defaultProps(type: BlockType, template: EmailTemplate): BlockProps {
  switch (type) {
    case "summary":
      return { rows: [row("Label", "{{recipient.name}}")] };
    case "details":
      return { rows: [row("Label", "{{organisation.name}}")] };
    case "impact":
      return { text: "{{event.summary}}", cond: "when present", fb: "" };
    case "eyebrow":
      return { text: "LABEL", color: "#62666c", size: 12 };
    case "cta":
      return {
        label: "Open in Scrubbe",
        url: template.variables.find((v) => v.type === "URL")?.key ?? "",
        align: "left",
        width: "auto",
      };
    default:
      return { text: "New paragraph", size: 15, color: "#33363a" };
  }
}

type Dialog =
  | { kind: "preview" | "test" | "submit" | "validate" | "discard" }
  | { kind: "leave"; href: string }
  | { kind: "deleteBlock"; id: string };

interface FocusedField {
  el: HTMLInputElement | HTMLTextAreaElement;
  apply: (value: string) => void;
}

/** Edits a draft copy; nothing reaches the stored template until Save Draft. */
export function TemplateEditor({ initial }: { initial: EmailTemplate }) {
  const { state, update } = useComms();
  const router = useRouter();
  const [draft, setDraft] = useState<EmailTemplate>(() => structuredClone(initial));
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState(initial.blocks[0]?.id ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<"rendered" | "html" | "text">("rendered");
  const [panel, setPanel] = useState<"blocks" | "canvas" | "props">("canvas");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const focused = useRef<FocusedField | null>(null);
  const dragId = useRef<string | null>(null);

  const values = sampleValues(draft);
  const rendered = renderEmail(draft, values, state.design);
  const errorCount = validateTemplate(draft).filter((issue) => issue.error).length;
  const selected = draft.blocks.find((b) => b.id === selectedId);

  function change(recipe: (d: EmailTemplate) => void) {
    setDraft((previous) => {
      const next = structuredClone(previous);
      recipe(next);
      return next;
    });
    setDirty(true);
  }

  function changeBlock(id: string, recipe: (b: EmailBlock) => void) {
    change((d) => {
      const block = d.blocks.find((b) => b.id === id);
      if (block) recipe(block);
    });
  }

  function save(quiet = false): boolean {
    const saved = update((s) => {
      saveDraft(s, draft);
      return true;
    });
    if (!saved) return false;
    setDirty(false);
    if (!quiet) toastSuccess("Draft saved locally.");
    return true;
  }

  // Keep the latest save and dirty flag reachable from the window listeners below.
  const saveRef = useRef(save);
  saveRef.current = save;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  function leave(href: string) {
    if (dirty) setDialog({ kind: "leave", href });
    else router.push(href);
  }

  function moveBlock(from: number, to: number) {
    change((d) => {
      if (to < 0 || to >= d.blocks.length) return;
      const [moved] = d.blocks.splice(from, 1);
      if (moved) d.blocks.splice(to, 0, moved);
    });
  }

  function addBlock(type: BlockType) {
    const name = ADDABLE.find(([t]) => t === type)?.[1] ?? "Block";
    const block = makeBlock(type, name, false, defaultProps(type, draft));
    // Footers stay last, so new blocks go just above it.
    change((d) => d.blocks.splice(Math.max(0, d.blocks.length - 1), 0, block));
    setSelectedId(block.id);
    toastSuccess(`${name} block added.`);
  }

  function track(el: HTMLInputElement | HTMLTextAreaElement, apply: (value: string) => void) {
    focused.current = { el, apply };
  }

  function insertVariable(key: string) {
    const target = focused.current;
    if (!target || !document.contains(target.el)) {
      toastError(null, "Select a text field first, then choose a variable.");
      return;
    }
    const { el, apply } = target;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const token = `{{${key}}}`;
    apply(el.value.slice(0, start) + token + el.value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const panelClass = (name: typeof panel, extra?: string) =>
    cn(
      "overflow-auto rounded-card border border-line bg-surface lg:block lg:h-[calc(100vh-210px)] lg:min-h-[560px]",
      panel === name ? "block" : "hidden",
      extra,
    );

  const segment = <T extends string>(current: T, options: [T, string][], onChange: (value: T) => void) => (
    <span className="inline-flex overflow-hidden rounded-md border border-line">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={current === value}
          className={cn(
            "px-2.5 py-1 text-xs transition-colors",
            current === value ? "bg-signal-strong text-canvas" : "bg-surface text-ink-muted hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </span>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => leave("/communications/templates")}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to Templates
          </Button>
          <span className="font-mono text-xs text-ink-muted">{draft.id}</span>
          <b className="truncate font-semibold text-ink">{draft.name}</b>
          <Badge className="font-mono">
            {draft.version} {draft.status.toLowerCase()}
          </Badge>
          <span role="status">
            {dirty ? <Badge tone="caution">Unsaved changes</Badge> : <Badge tone="live">All changes saved</Badge>}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => save()}>
            Save Draft
          </Button>
          <Button size="sm" onClick={() => setDialog({ kind: "preview" })}>
            Preview
          </Button>
          <Button size="sm" onClick={() => setDialog({ kind: "test" })}>
            Test Send
          </Button>
          <Button size="sm" variant="primary" onClick={() => setDialog({ kind: "submit" })}>
            Submit for Approval
          </Button>
          <ActionMenu
            label="More Actions"
            items={[
              {
                label: "Duplicate",
                onSelect: () => {
                  if (dirty && !save(true)) return;
                  const copyId = update((s) => duplicateTemplate(s, draft.id));
                  if (copyId) toastSuccess(`Duplicated as ${copyId}.`);
                },
              },
              { label: "Discard changes", onSelect: () => setDialog({ kind: "discard" }), disabled: !dirty },
              { label: "View History", onSelect: () => leave(`/communications/versions?template=${draft.id}`) },
            ]}
          />
        </div>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1 lg:hidden">
        {(
          [
            ["blocks", "Blocks"],
            ["canvas", "Preview"],
            ["props", "Properties"],
          ] as const
        ).map(([value, label]) => (
          <Button key={value} size="sm" variant={panel === value ? "primary" : "secondary"} onClick={() => setPanel(value)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)_280px] lg:gap-3 xl:grid-cols-[260px_minmax(0,1fr)_330px]">
        {/* ───── Content structure ───── */}
        <section aria-label="Content structure" className={panelClass("blocks", "p-3")}>
          <h3 className="mb-2 text-sm font-semibold text-ink">Content structure</h3>
          <div className="space-y-0.5">
            {draft.blocks.map((block, i) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => {
                  dragId.current = block.id;
                }}
                onDragOver={(event) => {
                  if (dragId.current) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = draft.blocks.findIndex((b) => b.id === dragId.current);
                  dragId.current = null;
                  if (from >= 0 && from !== i) moveBlock(from, i);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-1.5 py-1",
                  block.id === selectedId ? "border-signal bg-signal-soft" : "border-transparent hover:bg-raised",
                )}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-faint" aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(block.id);
                    setPanel("props");
                  }}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left text-sm",
                    block.visible ? "text-ink" : "text-ink-faint line-through",
                  )}
                >
                  {block.name}
                  {block.required ? " *" : ""}
                </button>
                <IconButton label={`Move ${block.name} up`} disabled={i === 0} onClick={() => moveBlock(i, i - 1)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label={`Move ${block.name} down`}
                  disabled={i === draft.blocks.length - 1}
                  onClick={() => moveBlock(i, i + 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label={`${block.visible ? "Hide" : "Show"} ${block.name}`}
                  disabled={block.required && block.visible}
                  onClick={() => changeBlock(block.id, (b) => (b.visible = !b.visible))}
                >
                  {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </IconButton>
                <IconButton
                  label={`Duplicate ${block.name}`}
                  onClick={() =>
                    change((d) => {
                      const index = d.blocks.findIndex((b) => b.id === block.id);
                      const copy = structuredClone(block);
                      copy.id = newBlockId();
                      copy.required = false;
                      copy.name = `${block.name} (copy)`;
                      d.blocks.splice(index + 1, 0, copy);
                    })
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label={block.required ? "Required blocks can't be deleted" : `Delete ${block.name}`}
                  disabled={block.required}
                  onClick={() => setDialog({ kind: "deleteBlock", id: block.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">* Required block. Drag to reorder, or use the arrows.</p>
          <label className="mt-3 grid gap-1 text-xs text-ink-muted">
            Add block
            <Select
              value=""
              onChange={(event) => {
                if (event.target.value) addBlock(event.target.value as BlockType);
              }}
            >
              <option value="">Choose a block type…</option>
              {ADDABLE.map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </section>

        {/* ───── Canvas ───── */}
        <section aria-label="Email canvas" className={panelClass("canvas", "bg-raised")}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
            {segment(device, [["desktop", "Desktop"], ["mobile", "Mobile"]], setDevice)}
            {segment(mode, [["rendered", "Rendered"], ["html", "HTML Source"], ["text", "Plain Text"]], setMode)}
            <Button size="sm" onClick={() => setDialog({ kind: "validate" })}>
              {errorCount ? `${errorCount} error${errorCount > 1 ? "s" : ""}` : "Validate"}
            </Button>
          </div>
          <div className="border-b border-line bg-surface px-4 py-2.5 text-xs leading-5">
            <b>Subject:</b> {substitute(draft.subject, draft, values, true)}
            <br />
            <b>Preview:</b> <span className="text-ink-muted">{substitute(draft.preview, draft, values, true)}</span>
            <br />
            <Badge tone="info" className="mt-1">
              Demonstration data
            </Badge>
          </div>
          {mode === "rendered" ? (
            <div className="flex justify-center p-4">
              <EmailFrame
                html={rendered.html}
                width={device === "mobile" ? 375 : state.design.width}
                className="h-[calc(100vh-340px)]"
              />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-ink">
              {mode === "html" ? rendered.html : rendered.text}
            </pre>
          )}
        </section>

        {/* ───── Inspector ───── */}
        <section aria-label="Property inspector" className={panelClass("props", "p-3")}>
          {selected ? (
            <BlockInspector
              block={selected}
              template={draft}
              onChange={(recipe) => changeBlock(selected.id, recipe)}
              track={track}
            />
          ) : (
            <p className="text-sm text-ink-faint">Select a block to edit its properties.</p>
          )}

          <hr className="my-4 border-line" />
          <h3 className="mb-2 text-sm font-semibold text-ink">Template</h3>
          <InspectorField label="Subject">
            <Input
              value={draft.subject}
              onFocus={(e) => track(e.currentTarget, (v) => change((d) => (d.subject = v)))}
              onChange={(e) => change((d) => (d.subject = e.target.value))}
            />
          </InspectorField>
          <InspectorField label="Preview text">
            <Textarea
              rows={2}
              value={draft.preview}
              onFocus={(e) => track(e.currentTarget, (v) => change((d) => (d.preview = v)))}
              onChange={(e) => change((d) => (d.preview = e.target.value))}
            />
          </InspectorField>

          <h3 className="mb-1 mt-4 text-sm font-semibold text-ink">
            Variables <span className="font-normal text-ink-faint">(demonstration sample values)</span>
          </h3>
          <div className="divide-y divide-line">
            {draft.variables.map((variable) => (
              <div
                key={variable.key}
                title={`${variable.description}. Fallback: ${variable.fallback || "none"}`}
                className="grid grid-cols-[1fr_100px_auto] items-center gap-1.5 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-ink">{variable.key}</span>
                  <span className="text-2xs text-ink-faint">
                    {variable.type} | {variable.required ? "Required" : "Optional"}
                  </span>
                </span>
                {variable.options ? (
                  <Select
                    className="h-8 px-2 text-xs"
                    value={values[variable.key] ?? ""}
                    onChange={(e) => change((d) => (d.sample[variable.key] = e.target.value))}
                    aria-label={`Sample value for ${variable.key}`}
                  >
                    {variable.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    className="h-8 px-2 text-xs"
                    value={values[variable.key] ?? ""}
                    onChange={(e) => change((d) => (d.sample[variable.key] = e.target.value))}
                    aria-label={`Sample value for ${variable.key}`}
                  />
                )}
                <Button size="sm" variant="ghost" onClick={() => insertVariable(variable.key)}>
                  Insert
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {dialog?.kind === "preview" ? (
        <PreviewModal template={draft} width={device === "mobile" ? 375 : 640} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "test" ? <TestSendModal template={draft} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "submit" ? (
        <SubmitModal
          template={draft}
          onClose={() => setDialog(null)}
          onSubmit={() => {
            if (!save(true)) return;
            update((s) => submitForApproval(s, draft.id));
            setDialog(null);
            toastSuccess("Submitted for approval (simulated).");
            router.push(`/communications/templates/${draft.id}`);
          }}
        />
      ) : null}
      {dialog?.kind === "validate" ? (
        <Modal
          open
          title="Validation"
          onClose={() => setDialog(null)}
          footer={
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Close
            </Button>
          }
        >
          <ValidationList issues={validateTemplate(draft)} />
        </Modal>
      ) : null}
      {dialog?.kind === "discard" ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          body="The editor goes back to the last saved draft."
          confirmLabel="Discard changes"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const stored = findTemplate(state, draft.id);
            if (stored) {
              setDraft(structuredClone(stored));
              setSelectedId(stored.blocks[0]?.id ?? "");
            }
            setDirty(false);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === "leave" ? (
        <ConfirmDialog
          title="Leave without saving?"
          body="You have unsaved changes in this template. Leaving discards them."
          confirmLabel="Leave and discard"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const { href } = dialog;
            setDirty(false);
            setDialog(null);
            router.push(href);
          }}
        />
      ) : null}
      {dialog?.kind === "deleteBlock" ? (
        <ConfirmDialog
          title="Delete this block?"
          body={`“${draft.blocks.find((b) => b.id === dialog.id)?.name ?? "This block"}” is removed from the template.`}
          confirmLabel="Delete block"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const { id } = dialog;
            change((d) => {
              d.blocks = d.blocks.filter((b) => b.id !== id);
            });
            if (selectedId === id) setSelectedId(draft.blocks.find((b) => b.id !== id)?.id ?? "");
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-ink-faint transition-colors hover:bg-line hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function InspectorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 grid gap-1 text-xs text-ink-muted">
      {label}
      {children}
    </label>
  );
}

function BlockInspector({
  block,
  template,
  onChange,
  track,
}: {
  block: EmailBlock;
  template: EmailTemplate;
  onChange: (recipe: (b: EmailBlock) => void) => void;
  track: (el: HTMLInputElement | HTMLTextAreaElement, apply: (value: string) => void) => void;
}) {
  const set = (key: string, value: string | number | boolean) =>
    onChange((b) => {
      b.props[key] = value;
    });
  const rows = block.props.rows;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{block.name}</h3>
      <p className="mb-3 mt-0.5 text-xs text-ink-faint">{HELP[block.type]}</p>

      {SCHEMA[block.type].map(([key, label, kind, options]) => {
        const value = block.props[key];

        if (kind === "checkbox") {
          const locked = key === "unsub" && isMandatoryCategory(template.category);
          return (
            <div key={key} className="mb-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(value) && !locked}
                  disabled={locked}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
              {locked ? (
                <Notice className="mt-1.5">
                  Unsubscribe is not permitted for mandatory security, account and operational emails.
                </Notice>
              ) : null}
            </div>
          );
        }

        let control: ReactNode;
        if (kind === "textarea") {
          control = (
            <Textarea
              rows={4}
              value={String(value ?? "")}
              onFocus={(e) => track(e.currentTarget, (v) => set(key, v))}
              onChange={(e) => set(key, e.target.value)}
            />
          );
        } else if (kind === "number") {
          control = <Input type="number" value={Number(value ?? 0)} onChange={(e) => set(key, Number(e.target.value))} />;
        } else if (kind === "color") {
          control = (
            <input
              type="color"
              value={String(value ?? "#000000")}
              onChange={(e) => set(key, e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-line bg-surface p-0.5"
            />
          );
        } else if (kind === "select" || kind === "enumVar" || kind === "urlVar") {
          const choices =
            kind === "select"
              ? options ?? []
              : template.variables.filter((v) => v.type === (kind === "enumVar" ? "Enum" : "URL")).map((v) => v.key);
          control = (
            <Select value={String(value ?? "")} onChange={(e) => set(key, e.target.value)}>
              {choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </Select>
          );
        } else {
          control = (
            <Input
              value={String(value ?? "")}
              onFocus={(e) => track(e.currentTarget, (v) => set(key, v))}
              onChange={(e) => set(key, e.target.value)}
            />
          );
        }

        return (
          <InspectorField key={key} label={label}>
            {control}
          </InspectorField>
        );
      })}

      {rows ? (
        <>
          <h3 className="mb-1 mt-2 text-sm font-semibold text-ink">Fields</h3>
          <div className="divide-y divide-line">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 py-1.5">
                <input
                  type="checkbox"
                  checked={r.on}
                  aria-label={`Show ${r.label}`}
                  onChange={(e) =>
                    onChange((b) => {
                      const target = b.props.rows?.[i];
                      if (target) target.on = e.target.checked;
                    })
                  }
                />
                <Input
                  className="h-8 px-2 text-xs"
                  value={r.label}
                  aria-label="Row label"
                  onChange={(e) =>
                    onChange((b) => {
                      const target = b.props.rows?.[i];
                      if (target) target.label = e.target.value;
                    })
                  }
                />
                <IconButton
                  label={`Move ${r.label} up`}
                  disabled={i === 0}
                  onClick={() =>
                    onChange((b) => {
                      const list = b.props.rows;
                      const [moved] = list ? list.splice(i, 1) : [];
                      if (list && moved) list.splice(i - 1, 0, moved);
                    })
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label={`Move ${r.label} down`}
                  disabled={i === rows.length - 1}
                  onClick={() =>
                    onChange((b) => {
                      const list = b.props.rows;
                      const [moved] = list ? list.splice(i, 1) : [];
                      if (list && moved) list.splice(i + 1, 0, moved);
                    })
                  }
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-faint">Rows with an empty optional variable are hidden automatically.</p>
        </>
      ) : null}

      {block.type === "severity" ? (
        <p className="mt-1 text-xs text-ink-faint">
          {Object.entries(SEVERITY_INFO)
            .map(([key, info]) => `${key} = ${info.label}`)
            .join(", ")}
        </p>
      ) : null}
    </div>
  );
}
