import { ChevronDown, CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { FormNotice } from "./api-form";

export function FormField({
  children,
  hint,
  label,
  name,
  required = false,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.035)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ExpandableFormSection({
  children,
  description,
  open = false,
  title,
}: {
  children: ReactNode;
  description: string;
  open?: boolean;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.035)]"
      open={open}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-black/[0.055] px-4 py-5 sm:px-6">{children}</div>
    </details>
  );
}

export function FormFeedback({ notice }: { notice: FormNotice | null }) {
  if (!notice) return null;

  const Icon = notice.kind === "success" ? CircleCheck : notice.kind === "error" ? CircleAlert : Info;

  return (
    <Alert
      aria-live="polite"
      className={cn(
        "rounded-2xl px-4 py-3",
        notice.kind === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        notice.kind === "info" && "border-amber-200 bg-amber-50 text-amber-900",
      )}
      variant={notice.kind === "error" ? "destructive" : "default"}
    >
      <Icon aria-hidden="true" />
      <AlertDescription className="leading-5">{notice.text}</AlertDescription>
    </Alert>
  );
}

export const controlClassName =
  "h-11 rounded-xl border-input bg-white px-3 shadow-xs focus-visible:ring-ring/20";

