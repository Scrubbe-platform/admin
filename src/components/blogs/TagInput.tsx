"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/primitives";

const TAG_PATTERN = /^#?[\w\d]+(?:-[\w\d]+)*$/i;
const MAX_TAGS = 10;

export function TagInput({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id: string;
}) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function commit() {
    const tag = draft.trim().replace(/^#/, "");
    if (!tag) return;

    if (tag.length < 2 || tag.length > 50) {
      setLocalError("Tags need to be 2 to 50 characters.");
      return;
    }
    if (!TAG_PATTERN.test(tag)) {
      setLocalError("Tags can use letters, numbers and single hyphens.");
      return;
    }
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setLocalError("That tag is already on the post.");
      return;
    }
    if (value.length >= MAX_TAGS) {
      setLocalError(`${MAX_TAGS} tags is the limit.`);
      return;
    }

    onChange([...value, tag]);
    setDraft("");
    setLocalError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded border border-line bg-raised px-2 py-1 text-xs text-ink"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-ink-faint transition-colors hover:text-danger"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        id={id}
        value={draft}
        placeholder={value.length >= MAX_TAGS ? "Tag limit reached" : "Type a tag, press Enter"}
        disabled={value.length >= MAX_TAGS}
        onChange={(event) => {
          setDraft(event.target.value);
          setLocalError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />

      {localError ? <p className="text-xs text-danger">{localError}</p> : null}
    </div>
  );
}
