import { describe, expect, it } from "vitest";
import {
  endOfCalendarWeek,
  formatCalendarMonth,
  formatCalendarWeek,
  normalizeCalendarMonthValue,
  normalizeCalendarWeekValue,
  parseDateOnly,
  startOfCalendarWeek,
} from "./dateUtils";

describe("calendar week utilities", () => {
  it("normalizes any day to Monday and crosses year boundaries", () => {
    expect(normalizeCalendarWeekValue("2027-01-01")).toBe("2026-12-28");
    expect(startOfCalendarWeek(new Date(2027, 0, 1))).toEqual(
      new Date(2026, 11, 28),
    );
    expect(endOfCalendarWeek(new Date(2027, 0, 1))).toEqual(
      new Date(2027, 0, 3),
    );
  });

  it("formats weeks that cross month and year boundaries", () => {
    expect(formatCalendarWeek("2026-06-29")).toBe(
      "29 jun - 5 jul 2026",
    );
    expect(formatCalendarWeek("2026-12-28")).toBe(
      "28 dic 2026 - 3 ene 2027",
    );
  });

  it("strictly rejects impossible date-only values", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(normalizeCalendarWeekValue("2026-02-30")).toBe("");
  });

  it("normalizes and formats calendar month values", () => {
    expect(normalizeCalendarMonthValue("2028-02")).toBe("2028-02");
    expect(normalizeCalendarMonthValue("2028-13")).toBe("");
    expect(formatCalendarMonth("2028-02")).toBe("febrero 2028");
  });
});
