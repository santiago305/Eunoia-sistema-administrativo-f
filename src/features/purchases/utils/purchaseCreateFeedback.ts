type PurchaseCreateResponse = {
  type?: string;
  message?: string;
};

export const getPurchaseCreateErrorMessage = (
  response: PurchaseCreateResponse | null | undefined,
) => {
  const message = response?.message?.trim();
  return message || "Registro fallido";
};
