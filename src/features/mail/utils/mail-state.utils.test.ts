import { describe, expect, it } from "vitest";
import {
  extractMailDetailLabelIds,
  hasAnyUnreadFromSidebarCounts,
  sameStringArray,
} from "./mail-state.utils";

describe("mail-state utils", () => {
  it("returns unread true when any unread bucket is > 0", () => {
    expect(
      hasAnyUnreadFromSidebarCounts({
        inbox: 0,
        trash: 0,
        archived: 0,
        snoozed: 2,
      }),
    ).toBe(true);
  });

  it("returns unread false when all buckets are 0", () => {
    expect(
      hasAnyUnreadFromSidebarCounts({
        inbox: 0,
        trash: 0,
        archived: 0,
        snoozed: 0,
      }),
    ).toBe(false);
  });

  it("extracts label ids from mixed detail payload", () => {
    expect(
      extractMailDetailLabelIds({
        labels: [{ id: "a" }, { labelId: "b" }, { id: "" }, {}],
      }),
    ).toEqual(["a", "b"]);
  });

  it("compares string arrays by same length and order", () => {
    expect(sameStringArray(["x", "y"], ["x", "y"])).toBe(true);
    expect(sameStringArray(["x", "y"], ["y", "x"])).toBe(false);
    expect(sameStringArray(["x"], ["x", "y"])).toBe(false);
  });
});
