import { describe, expect, it } from "vitest";
import {
  buildSnoozeQuickOptions,
  formatSnoozeDateInput,
  parseSnoozeDateInput,
  parseSnoozeTimeInput,
} from "./mail-snooze.utils";

describe("mail-snooze.utils", () => {
  it("builds quick options with expected target dates", () => {
    const base = new Date(2026, 4, 22, 13, 15, 0, 0);
    const options = buildSnoozeQuickOptions(base);

    expect(options).toHaveLength(3);
    expect(options[0].key).toBe("today-later");
    expect(options[1].key).toBe("tomorrow");
    expect(options[2].key).toBe("next-week");

    expect(options[0].date.getHours()).toBe(18);
    expect(options[0].date.getDate()).toBe(22);

    expect(options[1].date.getHours()).toBe(8);
    expect(options[1].date.getDate()).toBe(23);
  });

  it("uses next monday at 08:00 for next-week option", () => {
    const monday = new Date(2026, 4, 18, 14, 0, 0, 0);
    const tuesday = new Date(2026, 4, 19, 14, 0, 0, 0);

    const mondayOption = buildSnoozeQuickOptions(monday).find((item) => item.key === "next-week");
    const tuesdayOption = buildSnoozeQuickOptions(tuesday).find((item) => item.key === "next-week");

    expect(mondayOption?.date.getFullYear()).toBe(2026);
    expect(mondayOption?.date.getMonth()).toBe(4);
    expect(mondayOption?.date.getDate()).toBe(25);
    expect(mondayOption?.date.getHours()).toBe(8);
    expect(mondayOption?.date.getMinutes()).toBe(0);

    expect(tuesdayOption?.date.getFullYear()).toBe(2026);
    expect(tuesdayOption?.date.getMonth()).toBe(4);
    expect(tuesdayOption?.date.getDate()).toBe(25);
    expect(tuesdayOption?.date.getHours()).toBe(8);
    expect(tuesdayOption?.date.getMinutes()).toBe(0);
  });

  it("formats and parses custom date input", () => {
    const date = new Date("2026-05-24T08:00:00.000Z");
    const label = formatSnoozeDateInput(date);
    expect(label).toBe("24 may 2026");

    const parsed = parseSnoozeDateInput("25 may 2026", date);
    expect(parsed?.getUTCFullYear()).toBe(2026);
    expect(parsed?.getUTCMonth()).toBe(4);
    expect(parsed?.getUTCDate()).toBe(25);
  });

  it("parses custom time input", () => {
    const parsed = parseSnoozeTimeInput("8:30");
    expect(parsed).toEqual({ hours: 8, minutes: 30 });
    expect(parseSnoozeTimeInput("99:30")).toBeNull();
  });
});
