"use client";

import { cn } from "@/src/lib/utils";

interface ConfidenceBarProps {
  value: number | null | undefined;
  className?: string;
}

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const normalized = typeof value === "number" ? Math.max(0, Math.min(1, value)) : null;
  let color = "bg-slate-300";
  if (normalized != null) {
    if (normalized < 0.75) {
      color = "bg-amber-400";
    } else {
      color = "bg-brand-500";
    }
  }

  return (
    <div className={cn("flex w-full flex-col gap-1", className)} aria-hidden>
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Confiança</span>
        <span className="font-mono text-[11px]">
          {normalized != null ? normalized.toFixed(2) : "—"}
        </span>
      </div>
      <div className="h-2 rounded-full border border-dashed border-slate-200 bg-slate-100">
        {normalized != null ? (
          <div
            className={cn("h-full rounded-full transition-all", color)}
            style={{ width: `${normalized * 100}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
