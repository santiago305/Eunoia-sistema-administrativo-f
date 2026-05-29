import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mail } from "../types/mail-ui.types";

const downloadAttachmentBlobUrlMock = vi.hoisted(() => vi.fn());

vi.mock("../services/messages.service", () => ({
  downloadAttachmentBlobUrl: downloadAttachmentBlobUrlMock,
}));

import MailDetail from "./MailDetail";

const baseMail: Mail = {
  id: "message-2",
  messageId: "message-2",
  recipientId: "state-2",
  threadId: "thread-1",
  kind: "USER_MESSAGE",
  senderType: "USER",
  originModule: "corporate",
  from: { name: "Admin", email: "admin@example.com" },
  to: [{ name: "Santiago", email: "santiago@example.com" }],
  subject: "Re: Reporte",
  body: "<p>Respuesta actual</p>",
  preview: "Respuesta actual",
  date: "2026-05-20T11:00:00.000Z",
  read: true,
  starred: false,
  folder: "inbox",
  category: "personal",
  attachments: [],
};

const baseProps = {
  mail: baseMail,
  currentUserEmail: "santiago@example.com",
  onBack: vi.fn(),
  onSetRead: vi.fn(),
  onDelete: vi.fn(),
  onRestore: vi.fn(),
  onToggleStar: vi.fn(),
  onComposePrefill: vi.fn(),
  onInlineComposeSend: vi.fn(),
  onCreateInlineDraft: vi.fn(),
  onUploadAttachment: vi.fn(),
  onDeleteAttachment: vi.fn(),
  onExecuteAction: vi.fn(),
  formatFullDate: (iso: string) => iso,
  initialsOf: (name: string) => name.slice(0, 1).toUpperCase(),
  avatarColor: () => "rgb(37, 99, 235)",
};

describe("MailDetail thread view", () => {
  beforeEach(() => {
    downloadAttachmentBlobUrlMock.mockReset();
    downloadAttachmentBlobUrlMock.mockResolvedValue("blob:thread-image");
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("renders each thread message with sender identity and forwarded preview", () => {
    render(
      <MailDetail
        {...baseProps}
        detailData={{
          message: {
            id: "message-2",
            threadId: "thread-1",
            kind: "USER_MESSAGE",
            senderType: "USER",
            subject: "Re: Reporte",
            bodyHtml: "<p>Respuesta actual</p>",
            bodyText: "Respuesta actual",
            sentAt: "2026-05-20T11:00:00.000Z",
            createdAt: "2026-05-20T11:00:00.000Z",
          },
          sender: { id: "user-admin", name: "Admin", email: "admin@example.com" },
          recipients: [],
          attachments: [],
          permissions: { canReply: true, canForward: true },
          thread: [
            {
              id: "message-1",
              subject: "Reporte",
              bodyHtml: "<p>Mensaje original</p>",
              bodyJson: null,
              createdAt: "2026-05-20T10:00:00.000Z",
              sentAt: "2026-05-20T10:00:00.000Z",
              sender: { id: "user-santiago", name: "Santiago", email: "santiago@example.com" },
              recipients: [],
              attachments: [],
            },
            {
              id: "message-2",
              subject: "Re: Reporte",
              bodyHtml: "<p>Respuesta actual</p>",
              bodyJson: {
                forwardedMessage: {
                  subject: "Reporte original",
                  senderName: "Santiago",
                  senderEmail: "santiago@example.com",
                  sentAt: "2026-05-20T10:00:00.000Z",
                  bodyPreview: "Resumen del mensaje reenviado",
                },
              },
              createdAt: "2026-05-20T11:00:00.000Z",
              sentAt: "2026-05-20T11:00:00.000Z",
              sender: { id: "user-admin", name: "Admin", email: "admin@example.com" },
              recipients: [],
              attachments: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText("Santiago").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/santiago@example\.com/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    expect(screen.queryByText("Hilo de conversacion")).toBeNull();
    expect(screen.getAllByText("Respuesta actual")).toHaveLength(1);
    expect(screen.getByText("Mensaje reenviado")).toBeTruthy();
    expect(screen.getByText("Reporte original")).toBeTruthy();
    expect(screen.getByText("Resumen del mensaje reenviado")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Reporte" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Re: Reporte" })).toBeNull();
  });

  it("loads thread image attachments with the authenticated blob preview flow", async () => {
    render(
      <MailDetail
        {...baseProps}
        detailData={{
          sender: { id: "user-admin", name: "Admin", email: "admin@example.com" },
          recipients: [],
          attachments: [],
          permissions: { canReply: true, canForward: true },
          thread: [
            {
              id: "message-1",
              subject: "Reporte",
              bodyHtml: "<p>Mensaje original</p>",
              bodyJson: null,
              createdAt: "2026-05-20T10:00:00.000Z",
              sentAt: "2026-05-20T10:00:00.000Z",
              sender: { id: "user-santiago", name: "Santiago", email: "santiago@example.com" },
              recipients: [],
              attachments: [
                {
                  id: "image-1",
                  originalName: "foto.png",
                  mimeType: "image/png",
                  sizeBytes: 1024,
                  attachmentKind: "image",
                },
              ],
            },
          ],
        }}
      />,
    );

    await waitFor(() => expect(downloadAttachmentBlobUrlMock).toHaveBeenCalledWith("image-1"));
    expect(screen.getByAltText("foto.png").getAttribute("src")).toBe("blob:thread-image");
  });

  it("renders profile photos for thread senders when avatar urls are available", () => {
    render(
      <MailDetail
        {...baseProps}
        currentUserAvatarUrl="https://cdn.example.com/me.png"
        detailData={{
          sender: {
            id: "user-admin",
            name: "Admin",
            email: "admin@example.com",
            avatarUrl: "https://cdn.example.com/admin.png",
          },
          recipients: [],
          attachments: [],
          permissions: { canReply: true, canForward: true },
          thread: [
            {
              id: "message-1",
              subject: "Reporte",
              bodyHtml: "<p>Mensaje original</p>",
              bodyJson: null,
              createdAt: "2026-05-20T10:00:00.000Z",
              sentAt: "2026-05-20T10:00:00.000Z",
              sender: {
                id: "user-santiago",
                name: "Santiago",
                email: "santiago@example.com",
              },
              recipients: [],
              attachments: [],
            },
            {
              id: "message-2",
              subject: "Re: Reporte",
              bodyHtml: "<p>Respuesta actual</p>",
              bodyJson: null,
              createdAt: "2026-05-20T11:00:00.000Z",
              sentAt: "2026-05-20T11:00:00.000Z",
              sender: {
                id: "user-admin",
                name: "Admin",
                email: "admin@example.com",
                avatarUrl: "https://cdn.example.com/admin.png",
              },
              recipients: [],
              attachments: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("Foto de perfil de Santiago")).toHaveAttribute(
      "src",
      "https://cdn.example.com/me.png",
    );
    expect(screen.getByAltText("Foto de perfil de Admin")).toHaveAttribute(
      "src",
      "https://cdn.example.com/admin.png",
    );
  });
});
