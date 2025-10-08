import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  isValidBloodPressure,
  isValidDateInput,
  normalizeDecimalInput,
  parseDecimalInput,
  parseEvidence
} from "@/src/lib/validation";

describe("validation helpers", () => {
  it("validates pressure values", () => {
    expect(isValidBloodPressure("120/80")).toBe(true);
    expect(isValidBloodPressure("12/80")).toBe(false);
    expect(isValidBloodPressure("120-80")).toBe(false);
    expect(isValidBloodPressure("400/10")).toBe(false);
  });

  it("normalizes and parses decimal inputs", () => {
    expect(normalizeDecimalInput("36,5")).toBe("36.5");
    expect(parseDecimalInput("36,5")).toBeCloseTo(36.5);
    expect(parseDecimalInput("abc")).toBeNull();
  });

  it("validates ISO date", () => {
    expect(isValidDateInput("2024-04-25")).toBe(true);
    expect(isValidDateInput("25/04/2024")).toBe(false);
    expect(isValidDateInput("2024-13-10")).toBe(false);
  });

  it("parses evidence with and without timestamps", () => {
    expect(parseEvidence("[00:01-00:05] pressão arterial"));
    const parsed = parseEvidence("[00:01-00:05] pressão arterial");
    expect(parsed?.startSeconds).toBe(1);
    expect(parsed?.endSeconds).toBe(5);
    expect(parsed?.text).toBe("pressão arterial");

    const plain = parseEvidence("trecho sem tempo");
    expect(plain?.startSeconds).toBeNull();
    expect(plain?.text).toBe("trecho sem tempo");
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(75)).toBe("01:15");
    expect(formatTimestamp(null)).toBeNull();
  });
});
