import { describe, expect, it } from "vitest";
import { createUserSchema } from "./userSchemas";

describe("createUserSchema", () => {
  const baseUser = {
    name: "Ana",
    email: "ana@example.com",
    roleId: "role-1",
    telefono: "",
    mailStorageQuotaGb: 1,
  };

  it("rejects passwords shorter than 12 characters", () => {
    const result = createUserSchema.safeParse({
      ...baseUser,
      password: "12345678",
    });

    expect(result.success).toBe(false);
  });

  it("accepts passwords with at least 12 characters", () => {
    const result = createUserSchema.safeParse({
      ...baseUser,
      password: "123456789012",
    });

    expect(result.success).toBe(true);
  });
});
