import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxItem } from "../types/message.types";
import { useMessagesV2 } from "./useMessagesV2";

const listMessagesMock = vi.hoisted(() => vi.fn());

vi.mock("../services/messages.service", () => ({
  archiveMessage: vi.fn(),
  deleteMessage: vi.fn(),
  listMessages: listMessagesMock,
  markMessageAsRead: vi.fn(),
  markMessageAsUnread: vi.fn(),
  restoreMessage: vi.fn(),
  snoozeMessage: vi.fn(),
  starMessage: vi.fn(),
  unarchiveMessage: vi.fn(),
  unsnoozeMessage: vi.fn(),
  unstarMessage: vi.fn(),
}));

const makeInboxItem = (overrides?: Partial<InboxItem>): InboxItem => ({
  recipient: {
    id: "state-original",
    messageId: "message-original",
    recipientUserId: "user-1",
    recipientEmail: "santiago@example.com",
    recipientType: "TO",
    readAt: "2026-05-20T10:01:00.000Z",
    starredAt: null,
    deletedAt: null,
    deliveredAt: "2026-05-20T10:00:01.000Z",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z",
  },
  message: {
    id: "message-original",
    threadId: "thread-1",
    parentMessageId: null,
    kind: "USER_MESSAGE",
    originModule: "corporate",
    senderType: "USER",
    senderUserId: "user-2",
    createdByUserId: "user-2",
    subject: "Hola",
    bodyHtml: "<p>Mensaje original</p>",
    bodyText: "Mensaje original",
    bodyJson: null,
    status: "SENT",
    isDraft: false,
    sentAt: "2026-05-20T10:00:00.000Z",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z",
  },
  sender: { id: "user-2", name: "Admin", email: "admin@example.com" },
  labels: [],
  ...overrides,
});

describe("useMessagesV2 realtime thread merge", () => {
  beforeEach(() => {
    listMessagesMock.mockReset();
    listMessagesMock.mockResolvedValue({
      page: 1,
      limit: 50,
      total: 1,
      items: [makeInboxItem()],
    });
  });

  it("updates the existing thread row instead of adding a duplicate realtime reply", async () => {
    const { result } = renderHook(() => useMessagesV2({ folder: "inbox", page: 1, limit: 50 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);

    act(() => {
      result.current.insertRealtimeInboxItem({
        recipient: {
          id: "state-reply",
          messageId: "message-reply",
          recipientUserId: "user-1",
          recipientEmail: "santiago@example.com",
          recipientType: "TO",
          readAt: null,
          starredAt: null,
          deletedAt: null,
          deliveredAt: "2026-05-20T11:00:01.000Z",
          createdAt: "2026-05-20T11:00:00.000Z",
          updatedAt: "2026-05-20T11:00:00.000Z",
          isArchived: false,
          isInInbox: true,
        },
        message: {
          id: "message-reply",
          threadId: "thread-1",
          parentMessageId: "message-original",
          kind: "USER_MESSAGE",
          originModule: "corporate",
          senderType: "USER",
          senderUserId: "user-3",
          createdByUserId: "user-3",
          subject: "Re: Hola",
          bodyHtml: "<p>Respuesta nueva</p>",
          bodyText: "Respuesta nueva",
          bodyJson: null,
          status: "SENT",
          isDraft: false,
          sentAt: "2026-05-20T11:00:00.000Z",
          createdAt: "2026-05-20T11:00:00.000Z",
          updatedAt: "2026-05-20T11:00:00.000Z",
        },
        sender: { id: "user-3", name: "Santiago", email: "santiago@example.com" },
        labels: [],
      });
    });

    expect(result.current.total).toBe(1);
    expect(result.current.items).toHaveLength(1);
    const [item] = result.current.items;
    expect("recipient" in item ? item.recipient.id : "").toBe("state-reply");
    expect("recipient" in item ? item.message?.id : "").toBe("message-reply");
    expect("recipient" in item ? item.message?.bodyText : "").toBe("Respuesta nueva");
  });
});
