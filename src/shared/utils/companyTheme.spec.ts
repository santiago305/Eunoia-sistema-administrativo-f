import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  applyCompanyTheme,
  normalizeCompanyPrimaryColor,
} from "./companyTheme";

describe("companyTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("normaliza colores hexadecimales y usa el color predeterminado si son invÃ¡lidos", () => {
    expect(normalizeCompanyPrimaryColor(" #ff8800 ")).toBe("#FF8800");
    expect(normalizeCompanyPrimaryColor("orange")).toBe(DEFAULT_COMPANY_PRIMARY_COLOR);
  });

  it("convierte el color de empresa a los tokens visuales del sistema", () => {
    applyCompanyTheme("#FF0000");

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue("--primary")).toBe("0 100% 50%");
    expect(rootStyle.getPropertyValue("--ring")).toBe("0 100% 50%");
    expect(rootStyle.getPropertyValue("--sidebar-primary")).toBe("0 100% 50%");
    expect(rootStyle.getPropertyValue("--primary-foreground")).toBe("0 0% 100%");
  });

  it("elige texto oscuro para colores principales claros", () => {
    applyCompanyTheme("#FFFF00");

    expect(
      document.documentElement.style.getPropertyValue("--primary-foreground"),
    ).toBe("0 0% 0%");
  });
});
