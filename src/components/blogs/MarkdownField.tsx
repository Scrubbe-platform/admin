"use client";

import dynamic from "next/dynamic";
import rehypeSanitize from "rehype-sanitize";

import { Skeleton } from "@/components/ui/primitives";

// The editor touches `window` on import, so it is client-only.
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
});

export function MarkdownField({
  value,
  onChange,
  invalid = false,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  return (
    <div
      data-color-mode="light"
      className={invalid ? "rounded-md ring-1 ring-danger" : undefined}
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={440}
        preview="live"
        textareaProps={{ placeholder: "Write the post in markdown. The preview on the right is live." }}
        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
      />
    </div>
  );
}
