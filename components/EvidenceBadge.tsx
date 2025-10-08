"use client";

import { formatTimestamp, parseEvidence } from "@/src/lib/validation";
import { cn } from "@/src/lib/utils";

interface EvidenceBadgeProps {
  evidence: string | null | undefined;
  onClick?: (payload: { text: string; startSeconds: number | null; endSeconds: number | null }) => void;
  className?: string;
}

export function EvidenceBadge({ evidence, onClick, className }: EvidenceBadgeProps) {
  const parsed = parseEvidence(evidence ?? null);
  if (!parsed) {
    return null;
  }

  const startLabel = formatTimestamp(parsed.startSeconds);
  const endLabel = formatTimestamp(parsed.endSeconds);

  return (
    <button
      type="button"
      onClick={() => onClick?.(parsed)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:border-brand-400 hover:text-brand-600",
        className
      )}
      aria-label="Evidência na transcrição"
    >
      <span className="font-medium">Evidência</span>
      {startLabel && endLabel ? (
        <span className="font-mono text-[10px] text-slate-500">{`${startLabel} – ${endLabel}`}</span>
      ) : null}
      <span className="line-clamp-1 max-w-[140px] text-left">{parsed.text}</span>
    </button>
  );
}
