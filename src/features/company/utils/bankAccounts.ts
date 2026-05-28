export const normalizeBankAccountNumber = (value?: string | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};