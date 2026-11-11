import { FONT_STACKS, SEVERITY_INFO, isMandatoryCategory } from "@/lib/comms/catalog";
import type { DesignSystem, EmailBlock, EmailTemplate, SummaryRow, TemplateVariable } from "@/types/comms";

/**
 * Renders a template to table-based email HTML and plain text. Every value that
 * reaches the HTML is escaped, so sample data typed into the editor can't
 * inject markup.
 */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

export function isSafeUrl(url: string | undefined): boolean {
  return /^https:\/\/[^\s"'<>]+$/.test(url ?? "");
}

/** Variable keys referenced as {{key}} in the text, each once. */
export function variableRefs(text: string | undefined): string[] {
  const keys = [...String(text ?? "").matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1] ?? "");
  return [...new Set(keys)].filter(Boolean);
}

export function findVariable(template: EmailTemplate, key: string): TemplateVariable | undefined {
  return template.variables.find((v) => v.key === key);
}

/** The value each variable takes in previews: the editor's sample, or the variable's example. */
export function sampleValues(template: EmailTemplate): Record<string, string> {
  return Object.fromEntries(
    template.variables.map((v) => [
      v.key,
      Object.prototype.hasOwnProperty.call(template.sample, v.key) ? template.sample[v.key] ?? "" : v.example,
    ]),
  );
}

function isBlank(key: string, template: EmailTemplate, values: Record<string, string>): boolean {
  return !(values[key] ?? "") && !findVariable(template, key)?.fallback;
}

/** Fills {{key}} placeholders. Unknown or missing required values are flagged rather than silently dropped. */
export function substitute(
  text: string | undefined,
  template: EmailTemplate,
  values: Record<string, string>,
  plain = false,
): string {
  return String(text ?? "")
    .split(/(\{\{\s*[\w.]+\s*\}\})/)
    .map((part) => {
      const match = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(part);
      if (!match) return plain ? part : escapeHtml(part);
      const key = match[1] ?? "";
      const definition = findVariable(template, key);
      if (!definition) {
        return plain ? `[unknown ${key}]` : `<mark style="background:#fde2e0">[unknown ${escapeHtml(key)}]</mark>`;
      }
      let value = values[key];
      if (value === undefined || value === "") value = definition.fallback;
      if (!value) {
        if (!definition.required) return "";
        return plain ? `[missing ${key}]` : `<mark style="background:#fde2e0">[missing ${escapeHtml(key)}]</mark>`;
      }
      return plain ? value : escapeHtml(value);
    })
    .join("");
}

const str = (block: EmailBlock, key: string) => String(block.props[key] ?? "");
const num = (block: EmailBlock, key: string) => Number(block.props[key] ?? 0);

export interface RenderedBlock {
  html: string;
  text: string;
}

const EMPTY: RenderedBlock = { html: "", text: "" };

export function renderBlock(
  block: EmailBlock,
  template: EmailTemplate,
  values: Record<string, string>,
  design: DesignSystem,
): RenderedBlock {
  const font = `font-family:${FONT_STACKS[design.font]};`;
  const html = (text: string) => substitute(text, template, values).replace(/\n/g, "<br>");
  const plain = (text: string) => substitute(text, template, values, true);
  // Leaves the style attribute open so each block can append its own declarations.
  const cell = `class="px" style="padding:8px ${design.padding}px;${font}`;

  const visibleRows = (): SummaryRow[] =>
    (block.props.rows ?? []).filter((r) => {
      if (!r.on) return false;
      const refs = variableRefs(r.value);
      // A row whose only variables are empty and optional has nothing to say.
      return !(refs.length && refs.every((key) => isBlank(key, template, values) && !findVariable(template, key)?.required));
    });

  switch (block.type) {
    case "header":
      return {
        html: `<tr><td class="px" style="background:${escapeHtml(str(block, "bg"))};padding:${num(block, "pad")}px ${design.padding}px;text-align:${escapeHtml(str(block, "align"))};${font}font-size:16px;font-weight:600;letter-spacing:.04em;color:#1c1d1f;border-bottom:1px solid #e5e5e1">${escapeHtml(str(block, "logo"))}</td></tr>`,
        text: str(block, "logo"),
      };

    case "eyebrow":
      return {
        html: `<tr><td ${cell}padding-top:24px;font-size:${num(block, "size")}px;letter-spacing:.08em;font-weight:600;color:${escapeHtml(str(block, "color"))}">${escapeHtml(str(block, "text"))}</td></tr>`,
        text: str(block, "text"),
      };

    case "heading":
      return {
        html: `<tr><td ${cell}"><h1 style="margin:0;font-size:${num(block, "size")}px;line-height:1.3;font-weight:${escapeHtml(str(block, "weight"))};text-align:${escapeHtml(str(block, "align"))};color:${escapeHtml(str(block, "color"))}">${escapeHtml(str(block, "text"))}</h1></td></tr>`,
        text: str(block, "text").toUpperCase(),
      };

    case "text":
      return {
        html: `<tr><td ${cell}font-size:${num(block, "size")}px;line-height:1.6;color:${escapeHtml(str(block, "color"))}">${html(str(block, "text"))}</td></tr>`,
        text: plain(str(block, "text")),
      };

    case "severity": {
      const severity = values[str(block, "v")] ?? "";
      const info = SEVERITY_INFO[severity];
      const label = `${severity || "—"}${info ? ` – ${info.label}` : ""}`;
      return {
        html: `<tr><td ${cell}"><span style="font-size:13px;color:#62666c">${escapeHtml(str(block, "pre"))}</span><br><span style="display:inline-block;margin-top:4px;background:${info?.color ?? "#4b5563"};color:#fff;padding:6px 12px;border-radius:4px;font-weight:600;font-size:14px">${escapeHtml(label)}</span></td></tr>`,
        text: `${str(block, "pre")}: ${label}`,
      };
    }

    case "summary":
    case "details": {
      const shown = visibleRows();
      if (!shown.length) return EMPTY;
      return {
        html: `<tr><td ${cell}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e5e1">${shown
          .map(
            (r) =>
              `<tr><td style="padding:8px 0;width:38%;font-size:13px;color:#62666c;border-bottom:1px solid #e5e5e1;vertical-align:top">${escapeHtml(r.label)}</td><td style="padding:8px 0;font-size:14px;color:#1c1d1f;border-bottom:1px solid #e5e5e1">${html(r.value)}</td></tr>`,
          )
          .join("")}</table></td></tr>`,
        text: shown.map((r) => `${r.label}: ${plain(r.value)}`).join("\n"),
      };
    }

    case "impact": {
      const text = str(block, "text");
      const empty = variableRefs(text).some((key) => isBlank(key, template, values));
      if (empty && str(block, "cond") === "when present") return EMPTY;
      const fallback = empty ? str(block, "fb") || "No impact description provided." : null;
      return {
        html: `<tr><td ${cell}"><div style="border-left:4px solid #b45309;background:#fdf3dc;padding:12px 14px;font-size:14px;color:#3d2a00"><strong>Impact assessment</strong><br>${fallback ? escapeHtml(fallback) : html(text)}</div></td></tr>`,
        text: `IMPACT: ${fallback ?? plain(text)}`,
      };
    }

    case "cta": {
      const url = values[str(block, "url")];
      const safe = isSafeUrl(url);
      const full = str(block, "width") === "full";
      return {
        html: `<tr><td ${cell}padding-top:16px;padding-bottom:20px;text-align:${escapeHtml(str(block, "align"))}"><a href="${safe ? escapeHtml(url) : "#"}" style="display:${full ? "block" : "inline-block"};text-align:center;background:${escapeHtml(design.accent)};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:${design.radius}px">${escapeHtml(str(block, "label"))}</a><div style="font-size:12px;color:#62666c;margin-top:8px">You will be asked to sign in. Access and actions are controlled by Scrubbe, not by this email.</div></td></tr>`,
        text: `${str(block, "label")}: ${safe ? url : "[invalid link]"}`,
      };
    }

    case "footer": {
      const mandatory = isMandatoryCategory(template.category);
      const links = [
        block.props.prefs
          ? '<a href="https://app.scrubbe.com/settings/notifications" style="color:#62666c">Notification preferences</a>'
          : "",
        block.props.unsub && !mandatory ? '<a href="https://app.scrubbe.com/unsubscribe" style="color:#62666c">Unsubscribe</a>' : "",
        '<a href="https://scrubbe.com/support" style="color:#62666c">Support</a>',
      ].filter(Boolean);
      const recipient = values["recipient.email"];
      return {
        html: `<tr><td ${cell}padding-top:20px;padding-bottom:24px;border-top:1px solid #e5e5e1;font-size:12px;line-height:1.6;color:#62666c"><strong style="color:#1c1d1f">${escapeHtml(str(block, "company"))}</strong><br>${escapeHtml(str(block, "legal"))}<br>${links.join(" | ")}${recipient ? `<br>Sent to ${escapeHtml(recipient)}` : ""}</td></tr>`,
        text: `--\n${str(block, "company")}\n${str(block, "legal")}`,
      };
    }

    default:
      return EMPTY;
  }
}

export function renderEmail(
  template: EmailTemplate,
  values: Record<string, string>,
  design: DesignSystem,
): { html: string; text: string } {
  const blocks = template.blocks.filter((b) => b.visible).map((b) => renderBlock(b, template, values, design));
  const subject = substitute(template.subject, template, values, true);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media(max-width:480px){.w{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}}</style></head><body style="margin:0;padding:0;background:${escapeHtml(design.background)}"><div style="display:none;max-height:0;overflow:hidden">${substitute(template.preview, template, values)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${escapeHtml(design.background)}"><tr><td align="center" style="padding:24px 8px"><table role="presentation" class="w" width="${design.width}" cellpadding="0" cellspacing="0" style="width:${design.width}px;max-width:100%;background:${escapeHtml(design.contentBackground)};border:1px solid #e5e5e1;border-radius:${design.radius}px">${blocks.map((b) => b.html).join("")}</table></td></tr></table></body></html>`;
  const text = `Subject: ${subject}\n\n${blocks
    .map((b) => b.text)
    .filter(Boolean)
    .join("\n\n")}`;
  return { html, text };
}

export interface ValidationIssue {
  error: boolean;
  message: string;
}

/** The checks a template must pass before it can be submitted for approval. */
export function validateTemplate(template: EmailTemplate): ValidationIssue[] {
  const values = sampleValues(template);
  const issues: ValidationIssue[] = [];
  const error = (message: string) => issues.push({ error: true, message });
  const warn = (message: string) => issues.push({ error: false, message });

  if (!template.subject.trim()) error("Subject line is empty.");

  template.variables
    .filter((v) => v.required && isBlank(v.key, template, values))
    .forEach((v) => error(`Required variable ${v.key} has no sample value or fallback.`));

  const referenced = [
    template.subject,
    template.preview,
    ...template.blocks.flatMap((b) => [
      String(b.props.text ?? ""),
      String(b.props.label ?? ""),
      String(b.props.legal ?? ""),
      ...(b.props.rows ?? []).map((r) => r.value),
    ]),
  ].join(" ");
  variableRefs(referenced)
    .filter((key) => !findVariable(template, key))
    .forEach((key) => error(`Unknown variable {{${key}}} is referenced.`));

  template.blocks
    .filter((b) => b.required && !b.visible)
    .forEach((b) => error(`Required block “${b.name}” is hidden.`));

  template.blocks
    .filter((b) => b.type === "cta")
    .forEach((b) => {
      const urlKey = String(b.props.url ?? "");
      const definition = findVariable(template, urlKey);
      if (!definition || definition.type !== "URL") error("CTA destination must be a URL variable.");
      else if (!isSafeUrl(values[urlKey])) error(`CTA destination ${urlKey} is not a valid https URL.`);
      const label = String(b.props.label ?? "");
      if (/click here/i.test(label) || label.trim().length < 4) warn("CTA label should describe its destination.");
    });

  if (!template.preview.trim()) warn("Preview text is empty; email clients will show body text instead.");
  if (!template.blocks.some((b) => b.type === "heading" && b.visible)) warn("No visible heading block; add one for accessibility.");

  return issues;
}
