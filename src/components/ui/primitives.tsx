"use client";

import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

/* ───────────── Button ───────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-signal-strong text-canvas hover:bg-signal-hover font-medium",
  secondary: "bg-raised text-ink border border-line hover:border-line-strong",
  ghost: "text-ink-muted hover:text-ink hover:bg-raised",
  danger: "bg-danger text-white hover:brightness-110 font-medium",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

/* ───────────── Field wrapper ───────────── */

export interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm text-ink">
          {label}
          {required ? <span className="text-signal-strong"> *</span> : null}
        </label>
        {hint ? <span className="text-2xs text-ink-faint">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ───────────── Inputs ───────────── */

const CONTROL_BASE =
  "w-full rounded-md bg-surface border border-line px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors hover:border-line-strong focus:border-signal focus:outline-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid ? true : undefined}
        className={cn(CONTROL_BASE, "h-10", invalid && "border-danger", className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid ? true : undefined}
      className={cn(CONTROL_BASE, "py-2.5 leading-6 resize-y", invalid && "border-danger", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid ? true : undefined}
      className={cn(CONTROL_BASE, "h-10 pr-8", invalid && "border-danger", className)}
      {...rest}
    >
      {children}
    </select>
  );
});

/* ───────────── Surfaces ───────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card border border-line bg-surface", className)}>{children}</div>;
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "live" | "draft" | "danger" | "signal" | "caution" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-raised text-ink-muted border-line",
    live: "bg-live/10 text-live border-live/30",
    draft: "bg-draft/10 text-draft border-draft/30",
    danger: "bg-danger-soft text-danger border-danger/30",
    signal: "bg-signal-soft text-signal-strong border-signal/30",
    caution: "bg-caution-soft text-caution border-caution/30",
    info: "bg-info-soft text-info border-info/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-raised", className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-signal bg-signal" : "border-line-strong bg-line-strong",
        )}
      >
        <span
          className={cn(
            "block h-3.5 w-3.5 rounded-full bg-canvas shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
        {description ? <p className="text-xs text-ink-faint">{description}</p> : null}
      </div>
    </div>
  );
}
