import { describe, expect, it } from "bun:test";

import {
  formatCalendarDate,
  formatMinorUnits,
  parseCalendarDate,
  parseMoneyToMinorUnits,
} from "./value";

describe("exact Sprint 1 money values", () => {
  it("parses THB decimal strings into exact satang", () => {
    expect(parseMoneyToMinorUnits("0.01")).toBe(1n);
    expect(parseMoneyToMinorUnits("10.1")).toBe(1010n);
    expect(parseMoneyToMinorUnits("100.00")).toBe(10000n);
    expect(parseMoneyToMinorUnits("100")).toBe(10000n);
  });

  it("rejects non-positive, malformed, or over-precision amounts without rounding", () => {
    for (const value of [
      "0",
      "0.00",
      "-1.00",
      "+1.00",
      "1.001",
      ".50",
      "1e2",
      " 1.00",
    ]) {
      expect(() => parseMoneyToMinorUnits(value)).toThrow();
    }
  });

  it("formats exact minor units with two fractional digits", () => {
    expect(formatMinorUnits(1n)).toBe("0.01");
    expect(formatMinorUnits(1010n)).toBe("10.10");
    expect(formatMinorUnits(10000n)).toBe("100.00");
    expect(formatMinorUnits(0n)).toBe("0.00");
  });
});

describe("explicit calendar dates", () => {
  it("parses and formats a valid leap-day date without a timezone shift", () => {
    const value = parseCalendarDate("2024-02-29");

    expect(value.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(formatCalendarDate(value)).toBe("2024-02-29");
  });

  it("rejects invalid, missing, or timestamp-form dates", () => {
    for (const value of [
      "2025-02-29",
      "2024-13-01",
      "2024-04-31",
      "2024-1-01",
      "2024-01-01T00:00:00Z",
      "",
    ]) {
      expect(() => parseCalendarDate(value)).toThrow();
    }
  });
});
