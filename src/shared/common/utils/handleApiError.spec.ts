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

  it("shows the detailed rate-limit reason returned by the API", () => {
    const error = {
      response: {
        status: 429,
        data: {
          message:
            "Se alcanzo el limite de 120 solicitudes en 60 segundos para GET /inventory-documents.",
        },
      },
    };

    expect(parseApiError(error)).toContain("120 solicitudes en 60 segundos");
  });
});
