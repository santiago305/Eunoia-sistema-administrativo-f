import { describe, expect, it } from "vitest";
import {
  buildDraftBodyJson,
  extractDraftAttachmentIds,
  extractDraftCcRecipients,
  extractDraftRecipients,
  extractDraftSelectedLabelIds,
  hasMeaningfulComposeContentDraft,
  hasMeaningfulComposeDraft,
} from "./draft-compose.utils";

describe("draft-compose utils", () => {
  it("treats an empty compose as not meaningful", () => {
    expect(
      hasMeaningfulComposeDraft({
        to: " ",
        cc: "",
        bcc: "",
        subject: "",
        body: "<p></p>",
        bodyJson: null,
        attachmentIds: [],
        selectedLabelIds: [],
      }),
    ).toBe(false);
  });

  it("treats recipients, labels, attachments, text, and inline images as meaningful", () => {
    expect(hasMeaningfulComposeDraft({ to: "admin@example.com" })).toBe(true);
    expect(hasMeaningfulComposeDraft({ selectedLabelIds: ["label-1"] })).toBe(true);
    expect(hasMeaningfulComposeDraft({ attachmentIds: ["att-1"] })).toBe(true);
    expect(hasMeaningfulComposeDraft({ body: "<p>Hola</p>" })).toBe(true);
    expect(
      hasMeaningfulComposeDraft({
        bodyJson: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "blob:image" } }],
        },
      }),
    ).toBe(true);
  });

  it("separates draft content from labels-only metadata", () => {
    expect(hasMeaningfulComposeContentDraft({ selectedLabelIds: ["label-1"] })).toBe(false);
    expect(hasMeaningfulComposeDraft({ selectedLabelIds: ["label-1"] })).toBe(true);
  });

  it("stores and extracts draft metadata with stable keys", () => {
    const bodyJson = buildDraftBodyJson({
      bodyJson: { type: "doc" },
      to: "to@example.com",
      cc: "cc@example.com",
      bcc: "bcc@example.com",
      attachmentIds: ["att-1", "att-1", ""],
      selectedLabelIds: ["label-1", "label-1", ""],
    });

    expect(extractDraftRecipients(bodyJson)).toBe("to@example.com");
    expect(extractDraftCcRecipients(bodyJson)).toBe("cc@example.com");
    expect(bodyJson.draftBccRecipients).toBe("bcc@example.com");
    expect(extractDraftAttachmentIds(bodyJson)).toEqual(["att-1"]);
    expect(extractDraftSelectedLabelIds(bodyJson)).toEqual(["label-1"]);
  });
});
