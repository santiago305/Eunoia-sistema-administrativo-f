import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotificationComposeModal, { type NotificationComposeDraft } from "./ComposeModal";

const makeDraft = (patch: Partial<NotificationComposeDraft> = {}): NotificationComposeDraft => ({
  id: "compose-test",
  minimized: false,
  editingDraftId: null,
  mode: "new",
  parentMessageId: null,
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
  bodyJson: null,
  error: null,
  selectedLabelIds: [],
  attachmentIds: [],
  ...patch,
});

const baseProps = {
  labels: [],
  onToggleMinimize: vi.fn(),
  onClose: vi.fn(),
  onToChange: vi.fn(),
  onCcChange: vi.fn(),
  onBccChange: vi.fn(),
  onSubjectChange: vi.fn(),
  onBodyChange: vi.fn(),
  onModeChange: vi.fn(),
  onToggleLabel: vi.fn(),
  onResolveDraftId: vi.fn().mockResolvedValue("draft-id"),
  onAttachmentUploaded: vi.fn(),
  onAttachmentRemoved: vi.fn(),
  onUploadAttachment: vi.fn(),
  onDeleteAttachment: vi.fn(),
  onDiscard: vi.fn(),
  onSend: vi.fn(),
};

describe("NotificationComposeModal reply/forward chrome", () => {
  it("shows reply header in modal without subject or expand button", () => {
    render(
      <NotificationComposeModal
        {...baseProps}
        draft={makeDraft({
          mode: "reply",
          to: "santiago@example.com",
          subject: "Re: Hola",
        })}
      />,
    );

    expect(screen.getAllByText("Responder").length).toBeGreaterThan(0);
    expect(screen.getByText("santiago@example.com")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Asunto")).toBeNull();
    expect(screen.queryByTitle("Abrir en ventana")).toBeNull();
  });

  it("keeps old recipients row for forward modal and hides subject", async () => {
    render(
      <NotificationComposeModal
        {...baseProps}
        draft={makeDraft({
          mode: "forward",
          subject: "Fwd: Hola",
        })}
      />,
    );

    expect(screen.queryByPlaceholderText("Asunto")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Destinatarios" }));

    expect(screen.getByText("Para")).toBeTruthy();
    expect(screen.getByRole("button", { name: "CC" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "BCC" })).toBeTruthy();
  });
});
