"use client";

import { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface FieldCardProps {
  title: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
  highlight?: "warning" | "neutral" | "diff" | null;
  actions?: ReactNode;
}

export function FieldCard({ title, helperText, error, children, highlight, actions }: FieldCardProps) {
  const highlightClasses =
    highlight === "warning"
      ? "border-amber-300 bg-amber-50"
      : highlight === "diff"
        ? "border-sky-300 bg-sky-50"
        : "border-slate-200 bg-white";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100",
        highlightClasses
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-2 text-sm text-slate-700">{children}</div>
      {error ? <p className="mt-3 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
