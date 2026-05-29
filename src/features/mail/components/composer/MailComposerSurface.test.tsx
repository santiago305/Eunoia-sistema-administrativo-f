import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MailComposerSurface from "./MailComposerSurface";
import type { MailLabelItem } from "../../types/message.types";

const labelA: MailLabelItem = {
  id: "label-a",
  ownerUserId: null,
  key: "label-a",
  name: "Etiqueta A",
  type: "CUSTOM",
  color: "#2563eb",
  icon: null,
  isVisible: true,
  sortOrder: 1,
};

const renderComposer = (selectedLabelIds: string[], onSend = vi.fn()) =>
  render(
    <MailComposerSurface
      composeId="compose-test"
      to="usuario@example.com"
      cc=""
      bcc=""
      subject="Asunto"
      body="<p>Mensaje</p>"
      bodyJson={null}
      labels={[labelA]}
      selectedLabelIds={selectedLabelIds}
      onToChange={vi.fn()}
      onCcChange={vi.fn()}
      onBccChange={vi.fn()}
      onSubjectChange={vi.fn()}
      onBodyChange={vi.fn()}
      onResolveDraftId={vi.fn().mockResolvedValue("draft-id")}
      onAttachmentUploaded={vi.fn()}
      onAttachmentRemoved={vi.fn()}
      onUploadAttachment={vi.fn()}
      onDeleteAttachment={vi.fn()}
      onDiscard={vi.fn()}
      onSend={onSend}
    />,
  );

describe("MailComposerSurface labels in send overrides", () => {
  it("sends empty labels when compose has no selected labels", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    renderComposer([], onSend);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ selectedLabelIds: [] }));
  });

  it("sends only the selected labels visible in compose", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    renderComposer(["label-a"], onSend);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ selectedLabelIds: ["label-a"] }));
  });

  it("sends empty labels after label is unselected in the current compose view", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    const view = renderComposer(["label-a"], onSend);

    view.rerender(
      <MailComposerSurface
        composeId="compose-test"
        to="usuario@example.com"
        cc=""
        bcc=""
        subject="Asunto"
        body="<p>Mensaje</p>"
        bodyJson={null}
        labels={[labelA]}
        selectedLabelIds={[]}
        onToChange={vi.fn()}
        onCcChange={vi.fn()}
        onBccChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onBodyChange={vi.fn()}
        onResolveDraftId={vi.fn().mockResolvedValue("draft-id")}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        onUploadAttachment={vi.fn()}
        onDeleteAttachment={vi.fn()}
        onDiscard={vi.fn()}
        onSend={onSend}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ selectedLabelIds: [] }));
  });
});
