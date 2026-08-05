export type SkuLabelAttribute = { code: string; value: string };

export type SkuLabelSource = {
  name?: string | null;
  backendSku?: string | null;
  customSku?: string | null;
  attributes?: SkuLabelAttribute[] | null;
};

const preferredAttributeCodes = ["presentation", "variant", "color"];

export const formatSkuAttributes = (attributes?: SkuLabelAttribute[] | null) => {
  const valuesByCode = new Map(
    (attributes ?? []).map((attribute) => [attribute.code.toLowerCase(), attribute.value?.trim()]),
  );
  const preferred = preferredAttributeCodes
    .map((code) => valuesByCode.get(code))
    .filter((value): value is string => Boolean(value));
  const remaining = (attributes ?? [])
    .filter((attribute) => !preferredAttributeCodes.includes(attribute.code.toLowerCase()))
    .map((attribute) => attribute.value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set([...preferred, ...remaining])).join(" ");
};

export const buildSkuDisplayLabel = (source: SkuLabelSource, fallback = "SKU") =>
  [
    source.name?.trim() || fallback,
    formatSkuAttributes(source.attributes),
    source.backendSku?.trim() ? `- ${source.backendSku.trim()}` : "",
    source.customSku?.trim() ? `(${source.customSku.trim()})` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export const parseSkuLabelAttributes = (value?: string | null): SkuLabelAttribute[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SkuLabelAttribute =>
        Boolean(item) && typeof item === "object" &&
        typeof (item as SkuLabelAttribute).code === "string" &&
        typeof (item as SkuLabelAttribute).value === "string",
    );
  } catch {
    return [];
  }
};
