export const normalizeConversationSubject = (subject: string | null | undefined) =>
  String(subject ?? "").replace(/^(?:\s*(?:re|fwd):\s*)+/i, "").trim() || "(Sin asunto)";
