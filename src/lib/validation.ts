import { z } from "zod";

type EvidenceParseResult = {
  text: string;
  startSeconds: number | null;
  endSeconds: number | null;
};

const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function isValidBloodPressure(input: string): boolean {
  if (!input) return false;
  const normalized = input.trim();
  if (!bloodPressureRegex.test(normalized)) {
    return false;
  }
  const [systolic, diastolic] = normalized.split("/");
  const systolicValue = Number(systolic);
  const diastolicValue = Number(diastolic);
  if (!Number.isFinite(systolicValue) || !Number.isFinite(diastolicValue)) {
    return false;
  }
  return systolicValue >= 30 && systolicValue <= 300 && diastolicValue >= 20 && diastolicValue <= 200;
}

export function normalizeDecimalInput(input: string): string {
  return input.replace(/,/g, ".").replace(/\s+/g, "");
}

export function parseDecimalInput(input: string): number | null {
  if (!input) return null;
  const normalized = normalizeDecimalInput(input);
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function isValidDateInput(input: string): boolean {
  if (!input) return false;
  const normalized = input.trim();
  if (!dateRegex.test(normalized)) {
    return false;
  }
  const schema = z.coerce.date();
  try {
    const date = schema.parse(normalized);
    return date.toISOString().startsWith(normalized);
  } catch {
    return false;
  }
}

const evidenceRegex = /^\[(\d{2}):(\d{2})-(\d{2}):(\d{2})\]\s*(.*)$/;

export function parseEvidence(value: string | null | undefined): EvidenceParseResult | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  const match = trimmed.match(evidenceRegex);
  if (!match) {
    return {
      text: trimmed,
      startSeconds: null,
      endSeconds: null
    };
  }
  const [, startMinutes, startSeconds, endMinutes, endSeconds, text] = match;
  const start = Number(startMinutes) * 60 + Number(startSeconds);
  const end = Number(endMinutes) * 60 + Number(endSeconds);
  return {
    text: text.trim(),
    startSeconds: Number.isFinite(start) ? start : null,
    endSeconds: Number.isFinite(end) ? end : null
  };
}

export function formatTimestamp(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) {
    return null;
  }
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}
