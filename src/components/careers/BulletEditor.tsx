"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/**
 * Replaces the raw textarea the old form used. The public careers page renders
 * these fields as bullet lists, so the admin collects them as a list: one line
 * is one bullet, with no newline parsing to get wrong later.
 */
export function BulletEditor({
  value,
  onChange,
  placeholder,
  addLabel,
  invalid = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  invalid?: boolean;
}) {
  const [focused, setFocused] = useState<number | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function update(index: number, text: string) {
    onChange(value.map((item, i) => (i === index ? text : item)));
  }

  function insertAfter(index: number) {
    const next = [...value];
    next.splice(index + 1, 0, "");
    onChange(next);
    requestAnimationFrame(() => inputsRef.current[index + 1]?.focus());
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(target, 0, moved);
    onChange(next);
    requestAnimationFrame(() => inputsRef.current[target]?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      insertAfter(index);
      return;
    }
    if (event.key === "Backspace" && value[index] === "" && value.length > 1) {
      event.preventDefault();
      remove(index);
      requestAnimationFrame(() => inputsRef.current[Math.max(0, index - 1)]?.focus());
      return;
    }
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      move(index, -1);
      return;
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      move(index, 1);
    }
  }

  /** Pasting a block of lines becomes one bullet per line rather than one long bullet. */
  function onPaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const text = event.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    event.preventDefault();

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-•*\d.)]+\s*/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const next = [...value];
    next.splice(index, 1, ...lines);
    onChange(next);
  }

  const items = value.length > 0 ? value : [""];

  return (
    <div className={cn("space-y-1.5 rounded-md border bg-surface p-2", invalid ? "border-danger" : "border-line")}>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "group flex items-center gap-1 rounded px-1 transition-colors",
              focused === index ? "bg-raised" : "hover:bg-raised/50",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />

            <input
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              value={item}
              placeholder={index === 0 ? placeholder : ""}
              onChange={(event) => {
                if (value.length === 0) onChange([event.target.value]);
                else update(index, event.target.value);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              onPaste={(event) => onPaste(event, index)}
              onFocus={() => setFocused(index)}
              onBlur={() => setFocused(null)}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />

            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <IconButton label={`Move bullet ${index + 1} up`} onClick={() => move(index, -1)} disabled={index === 0}>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
              <IconButton
                label={`Move bullet ${index + 1} down`}
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
              <IconButton label={`Remove bullet ${index + 1}`} onClick={() => remove(index)} danger>
                <X className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 pl-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => insertAfter(items.length - 1)}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {addLabel}
        </Button>
        <span className="pr-1 text-2xs text-ink-faint">
          Enter adds a bullet · Alt+↑↓ reorders · pasting a list splits it
        </span>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded p-1 text-ink-faint transition-colors disabled:opacity-30",
        danger ? "hover:text-danger" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
