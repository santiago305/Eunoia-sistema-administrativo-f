import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InlineReplyForwardBox from "./InlineReplyForwardBox";

const baseComposerProps = {
  composeId: "inline-compose",
  subject: "Re: Hola",
  body: "",
  bodyJson: null,
  attachmentIds: [],
  isBusy: false,
  isSending: false,
  error: null,
  onSubjectChange: vi.fn(),
  onBodyChange: vi.fn(),
  onResolveDraftId: vi.fn().mockResolvedValue("draft-id"),
  onAttachmentUploaded: vi.fn(),
  onAttachmentRemoved: vi.fn(),
  onUploadAttachment: vi.fn(),
  onDeleteAttachment: vi.fn(),
};

describe("InlineReplyForwardBox", () => {
  it("renders reply inline and sends without showing labels or subject", async () => {
    const onSend = vi.fn();
    const onDiscard = vi.fn();

    render(
      <InlineReplyForwardBox
        mode="reply"
        to="santiago@example.com"
        cc=""
        bcc=""
        recipientLabel="Santiago <santiago@example.com>"
        onModeChange={vi.fn()}
        onToChange={vi.fn()}
        onCcChange={vi.fn()}
        onBccChange={vi.fn()}
        onExpand={vi.fn()}
        onSend={onSend}
        onDiscard={onDiscard}
        {...baseComposerProps}
      />,
    );

    expect(screen.getByText("Responder")).toBeTruthy();
    expect(screen.getByText("Santiago <santiago@example.com>")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Asunto")).toBeNull();
    expect(screen.queryByTitle("Etiquetas")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSend).toHaveBeenCalledWith({
      to: "santiago@example.com",
      cc: "",
      bcc: "",
    });
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("lets forward mode edit recipients and expand to modal", async () => {
    const onToChange = vi.fn();
    const onExpand = vi.fn();

    render(
      <InlineReplyForwardBox
        mode="forward"
        to=""
        cc=""
        bcc=""
        recipientLabel=""
        onModeChange={vi.fn()}
        onToChange={onToChange}
        onCcChange={vi.fn()}
        onBccChange={vi.fn()}
        onExpand={onExpand}
        onSend={vi.fn()}
        onDiscard={vi.fn()}
        {...baseComposerProps}
      />,
    );

    await userEvent.type(screen.getByLabelText("Para"), "admin@example.com");
    await userEvent.click(screen.getByTitle("Abrir en ventana"));

    expect(onToChange).toHaveBeenLastCalledWith("admin@example.com");
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
