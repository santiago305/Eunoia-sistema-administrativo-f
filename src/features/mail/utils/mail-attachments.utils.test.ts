import { describe, expect, it } from "vitest";
import {
  formatMailAttachmentSize,
  isInlineImageAttachment,
  mapMailAttachment,
  removeBrokenMailBodyImages,
  sanitizeMailHtml,
} from "./mail-attachments.utils";

describe("mail attachments utils", () => {
  it("renders an image uploaded as file as inline preview", () => {
    expect(
      isInlineImageAttachment({
        mimeType: "image/png",
        attachmentKind: "file",
      }),
    ).toBe(true);
  });

  it("renders an image uploaded as image as inline preview", () => {
    expect(
      isInlineImageAttachment({
        mimeType: "image/png",
        attachmentKind: "image",
      }),
    ).toBe(true);
  });

  it("maps backend attachment metadata into a safe download model", () => {
    expect(
      mapMailAttachment(
        {
          id: "a/b",
          originalName: "foto.png",
          mimeType: "image/png",
          sizeBytes: "2048",
          attachmentKind: "file",
        },
        "/api",
      ),
    ).toMatchObject({
      id: "a/b",
      name: "foto.png",
      mimeType: "image/png",
      size: "2 KB",
      sizeBytes: 2048,
      attachmentKind: "file",
      url: "/api/mail/attachments/a%2Fb/download",
    });
  });

  it("formats MB without hiding the exact weight range", () => {
    expect(formatMailAttachmentSize(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("removes body images without src so stale blob images do not render broken", () => {
    expect(removeBrokenMailBodyImages('<p>hola<img alt="foto.png" /></p>')).toBe("<p>hola</p>");
  });

  it("sanitizes dangerous html before rendering mail body", () => {
    const sanitized = sanitizeMailHtml(
      '<p onclick="alert(1)">hola</p><script>alert(1)</script><a href="javascript:alert(2)">x</a><img src="javascript:alert(3)" />',
    );

    expect(sanitized).toContain("<p>hola</p>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("<img");
  });
});
