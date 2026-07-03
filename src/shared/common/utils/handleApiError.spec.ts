import { describe, expect, it } from "vitest";
import { parseApiError } from "./handleApiError";

describe("parseApiError", () => {
  it("formats array validation messages as readable text", () => {
    const error = {
      response: {
        data: {
          message: ["serie must be a string", "correlative must be an integer"],
        },
      },
    };

    expect(parseApiError(error, "No se pudo registrar")).toBe(
      "serie must be a string. correlative must be an integer",
    );
  });
});
