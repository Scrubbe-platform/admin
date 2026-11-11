"use client";

import { ImageOff, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button, Input } from "@/components/ui/primitives";
import { toastError } from "@/lib/toast";
import { uploadImage } from "@/lib/upload/uploadImage";

/**
 * Two paths: upload (unwired, fails visibly) and paste a URL (works today).
 * The paste path is the honest interim, not a stand-in for the real one.
 */
export function CoverImageField({
  value,
  onChange,
  id,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  async function onFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onChange(result.url);
      setBroken(false);
    } catch (error) {
      toastError(error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2.5">
      <Input
        id={id}
        value={value ?? ""}
        placeholder="https://…"
        onChange={(event) => {
          onChange(event.target.value.trim() === "" ? null : event.target.value);
          setBroken(false);
        }}
      />

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
        <Button
          type="button"
          size="sm"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Upload a file
        </Button>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-md border border-line bg-raised">
          {broken ? (
            <div className="flex items-center gap-2 px-3 py-6 text-xs text-ink-faint">
              <ImageOff className="h-4 w-4" aria-hidden />
              That URL didn&apos;t load.
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-40 w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
