type ComposeDraftLike = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyJson?: Record<string, unknown> | null;
  attachmentIds?: string[];
  selectedLabelIds?: string[];
};

const stripHtml = (html?: string) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const uniqueStrings = (items?: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return Array.from(new Set(items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
};

const hasMeaningfulBodyJsonNode = (node: unknown): boolean => {
  if (!node || typeof node !== "object") return false;
  const current = node as Record<string, unknown>;
  if (typeof current.text === "string" && current.text.trim()) return true;
  if (current.type === "image") return true;
  if (Array.isArray(current.content)) return current.content.some(hasMeaningfulBodyJsonNode);
  return false;
};

export const hasMeaningfulComposeDraft = (draft: ComposeDraftLike): boolean => {
  if (draft.to?.trim() || draft.cc?.trim() || draft.bcc?.trim() || draft.subject?.trim()) return true;
  if (stripHtml(draft.body)) return true;
  if (hasMeaningfulBodyJsonNode(draft.bodyJson)) return true;
  if ((draft.attachmentIds ?? []).some((id) => id.trim())) return true;
  if ((draft.selectedLabelIds ?? []).some((id) => id.trim())) return true;
  return false;
};

export const extractDraftRecipients = (bodyJson: Record<string, unknown> | null | undefined): string => {
  const raw = bodyJson && typeof bodyJson === "object" ? bodyJson.draftRecipients : "";
  return typeof raw === "string" ? raw : "";
};

export const extractDraftCcRecipients = (bodyJson: Record<string, unknown> | null | undefined): string => {
  const raw = bodyJson && typeof bodyJson === "object" ? bodyJson.draftCcRecipients : "";
  return typeof raw === "string" ? raw : "";
};

export const extractDraftBccRecipients = (bodyJson: Record<string, unknown> | null | undefined): string => {
  const raw = bodyJson && typeof bodyJson === "object" ? bodyJson.draftBccRecipients : "";
  return typeof raw === "string" ? raw : "";
};

export const extractDraftAttachmentIds = (bodyJson: Record<string, unknown> | null | undefined): string[] =>
  uniqueStrings(bodyJson && typeof bodyJson === "object" ? bodyJson.draftAttachmentIds : []);

export const extractDraftSelectedLabelIds = (bodyJson: Record<string, unknown> | null | undefined): string[] =>
  uniqueStrings(bodyJson && typeof bodyJson === "object" ? bodyJson.draftSelectedLabelIds : []);

export const buildDraftBodyJson = (draft: ComposeDraftLike): Record<string, unknown> => ({
  ...(draft.bodyJson ?? {}),
  draftRecipients: draft.to ?? "",
  draftCcRecipients: draft.cc ?? "",
  draftBccRecipients: draft.bcc ?? "",
  draftAttachmentIds: uniqueStrings(draft.attachmentIds),
  draftSelectedLabelIds: uniqueStrings(draft.selectedLabelIds),
});
