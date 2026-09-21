import { describe, expect, it, vi } from "vitest";
import { getPaymentMethodsByCompany } from "./paymentMethodService";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: getMock,
  },
}));

describe("paymentMethodService", () => {
  it("normaliza los nombres del contrato de métodos configurados por empresa", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        type: "success",
        data: [
          {
            companyMethodId: "company-method-1",
            companyId: "company-1",
            methodId: "method-1",
            methodName: "Transferencia bancaria",
            methodCode: "BANK_TRANSFER",
            isActive: true,
            requiresVoucher: true,
            enabled: true,
          },
        ],
      },
    });

    const result = await getPaymentMethodsByCompany("company-1");

    expect(getMock).toHaveBeenCalledWith(
      "/company-methods/by-company/company-1",
    );
    expect(result).toEqual([
      expect.objectContaining({
        companyMethodId: "company-method-1",
        methodId: "method-1",
        name: "Transferencia bancaria",
        code: "BANK_TRANSFER",
      }),
    ]);
  });

  it("tolera una respuesta sin registros", async () => {
    getMock.mockResolvedValueOnce({ data: { type: "success" } });

    await expect(getPaymentMethodsByCompany("company-1")).resolves.toEqual([]);
  });
});
