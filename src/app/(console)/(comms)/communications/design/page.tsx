"use client";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader } from "@/components/comms/parts";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { FONT_STACKS } from "@/lib/comms/catalog";
import { findTemplate } from "@/lib/comms/operations";
import { renderBlock, sampleValues } from "@/lib/comms/render";
import { DEFAULT_DESIGN, row } from "@/lib/comms/seed";
import type { BlockType, DesignSystem, EmailBlock, FontKey } from "@/types/comms";

export default function DesignSystemPage() {
  const { state, update } = useComms();
  const design = state.design;
  // The incident template carries every block type, so it supplies the samples.
  const source = findTemplate(state, "INC-02") ?? state.templates[0];

  const set = <K extends keyof DesignSystem>(key: K, value: DesignSystem[K]) =>
    update((draft) => {
      draft.design[key] = value;
    });

  const components: [string, string][] = [];
  if (source) {
    const values = sampleValues(source);
    const wrap = (html: string) =>
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${design.contentBackground};font-family:${FONT_STACKS[design.font]}">${html}</table>`;
    const block = (type: BlockType) => source.blocks.find((b) => b.type === type);
    const rendered = (b: EmailBlock | undefined) => (b ? wrap(renderBlock(b, source, values, design).html) : "");
    const banner = (border: string, background: string, color: string, label: string, text: string) =>
      wrap(
        `<tr><td style="padding:8px ${design.padding}px"><div style="border-left:4px solid ${border};background:${background};color:${color};padding:10px 14px;font-size:14px"><strong>${label}</strong><br>${text}</div></td></tr>`,
      );
    const approval: EmailBlock = {
      id: "approval",
      type: "details",
      name: "Approval panel",
      required: false,
      visible: true,
      props: {
        rows: [row("Submitted by", "Sarah Mitchell"), row("Reviewer", "Priya Raman"), row("Status", "Pending approval")],
      },
    };

    components.push(
      ["Header", rendered(block("header"))],
      ["Footer", rendered(block("footer"))],
      ["CTA button", rendered(block("cta"))],
      ["Severity badge", rendered(block("severity"))],
      ["Information panel", banner("#1d4ed8", "#e8effc", "#12306e", "Information", "Investigation is in progress.")],
      ["Incident summary", rendered(block("summary"))],
      ["Approval panel", rendered(approval)],
      ["Metadata table", rendered(block("details"))],
      ["Warning banner", banner("#b45309", "#fdf3dc", "#3d2a00", "Warning", "Approval expires in 2 hours.")],
      ["Success banner", banner("#17653f", "#e6f4ec", "#0d3a24", "Success", "Remediation verified.")],
      [
        "Policy notice",
        banner("#4b5563", "#f0f0ed", "#1c1d1f", "Policy notice", "This action requires approval under policy GOV-APR-02."),
      ],
    );
  }

  const color = (key: "accent" | "background" | "contentBackground", label: string) => (
    <Field label={label} htmlFor={`ds-${key}`}>
      <input
        id={`ds-${key}`}
        type="color"
        value={design[key]}
        onChange={(e) => set(key, e.target.value)}
        className="h-9 w-14 cursor-pointer rounded border border-line bg-surface p-0.5"
      />
    </Field>
  );

  const number = (key: "width" | "padding" | "radius", label: string, min: number, max: number) => (
    <Field label={label} htmlFor={`ds-${key}`}>
      <Input
        id={`ds-${key}`}
        type="number"
        min={min}
        max={max}
        value={design[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </Field>
  );

  return (
    <div>
      <CommsHeader
        title="Design System"
        description="Shared visual components used across all Scrubbe emails. Changes below update every email preview in this demonstration."
        actions={<Button onClick={() => update((draft) => void (draft.design = { ...DEFAULT_DESIGN }))}>Reset design system</Button>}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink">Settings</h2>
          <Field label="Company name" htmlFor="ds-company">
            <Input id="ds-company" value={design.company} onChange={(e) => set("company", e.target.value)} />
          </Field>
          {color("accent", "Brand / button colour")}
          {color("background", "Email background")}
          {color("contentBackground", "Content background")}
          <Field label="Typography" htmlFor="ds-font">
            <Select id="ds-font" value={design.font} onChange={(e) => set("font", e.target.value as FontKey)}>
              {(Object.keys(FONT_STACKS) as FontKey[]).map((font) => (
                <option key={font}>{font}</option>
              ))}
            </Select>
          </Field>
          {number("width", "Maximum email width (px)", 480, 700)}
          {number("padding", "Content padding (px)", 12, 48)}
          {number("radius", "Border radius (px)", 0, 16)}
          <p className="text-xs leading-5 text-ink-faint">
            Heading 26/600, body 15/1.6, small 12–13, labels 13, button 15/600. Fonts use email-safe stacks.
          </p>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {components.map(([name, html]) => (
            <div key={name}>
              <h3 className="mb-1.5 text-sm font-semibold text-ink">{name}</h3>
              {/* Rendered by lib/comms/render, which escapes every value it inserts. */}
              <div className="overflow-hidden rounded-card border border-line bg-white" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
