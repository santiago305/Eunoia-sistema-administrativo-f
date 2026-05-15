import { useState, useRef, useEffect } from "react";
import {
  Check,
  Bookmark,
  X,
  Minus,
  Maximize2,
  Trash2,
  Paperclip,
  Link as LinkIcon,
  Type,
  Send,
  Smile,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import type { MailLabelItem } from "../types/message.types";
import { SystemButton } from "../../../shared/components/components/SystemButton";
import { Popover } from "@/shared/components/modales/Popover";

type AttachmentItem = {
  id: string;
  serverId?: string;
  name: string;
  sizeLabel: string;
  kind: "image" | "file";
  previewUrl?: string;
  file: File;
  uploading?: boolean;
  uploadError?: string | null;
};

export type NotificationComposeDraft = {
  id: string;
  minimized: boolean;
  editingDraftId: string | null;
  mode: "new" | "reply" | "forward";
  parentMessageId: string | null;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  bodyJson?: Record<string, unknown> | null;
  error: string | null;
  selectedLabelIds: string[];
  attachmentIds?: string[];
};

interface Props {
  draft: NotificationComposeDraft;
  labels?: MailLabelItem[];
  onToggleMinimize: (composeId: string) => void;
  onClose: (composeId: string) => void;
  onToChange: (composeId: string, value: string) => void;
  onCcChange: (composeId: string, value: string) => void;
  onBccChange: (composeId: string, value: string) => void;
  onSubjectChange: (composeId: string, value: string) => void;
  onBodyChange: (composeId: string, value: string, bodyJson: Record<string, unknown> | null, bodyText: string) => void;
  onToggleLabel: (composeId: string, labelId: string) => void;
  onResolveDraftId: (composeId: string) => Promise<string>;
  onAttachmentUploaded: (composeId: string, attachmentId: string) => void;
  onAttachmentRemoved: (composeId: string, attachmentId: string) => void;
  onUploadAttachment: (input: { composeId: string; file: File; draftId: string }) => Promise<{ id: string }>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onDiscard: (composeId: string) => void | Promise<void>;
  onSend: (
    composeId: string,
    overrides?: Partial<
      Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds">
      & { attachmentIds?: string[]; bodyJson?: Record<string, unknown> | null }
    >,
  ) => void | Promise<void>;
}

export default function NotificationComposeModal({
  draft,
  labels,
  onToggleMinimize,
  onClose,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onToggleLabel,
  onResolveDraftId,
  onAttachmentUploaded,
  onAttachmentRemoved,
  onUploadAttachment,
  onDeleteAttachment,
  onDiscard,
  onSend,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const labelsAnchorRef = useRef<HTMLButtonElement | null>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);

  const [showFormat, setShowFormat] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recipientDraft, setRecipientDraft] = useState("");
  const [recipientTokens, setRecipientTokens] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  useEffect(() => {
    const tokens = draft.to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setRecipientTokens(tokens);
  }, [draft.to]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: (draft.bodyJson as JSONContent | null) ?? (draft.body || ""),
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const json = instance.getJSON() as Record<string, unknown>;
      const text = instance.getText().trim();
      onBodyChange(draft.id, html, json, text);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] flex-1 overflow-y-auto px-4 py-3 text-sm outline-none prose prose-sm max-w-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((draft.body || "") !== current) {
      const nextContent = (draft.bodyJson as JSONContent | null) ?? (draft.body || "");
      editor.commands.setContent(nextContent, false);
    }
  }, [draft.body, draft.bodyJson, editor]);

  const toSizeLabel = (size: number) => `${Math.max(1, Math.round(size / 1024))} KB`;

  const addFiles = async (files: FileList | null, kind: "image" | "file") => {
    if (!files?.length) return;

    const next: AttachmentItem[] = [];

    Array.from(files).forEach((file) => {
      const isImage = kind === "image" || file.type.startsWith("image/");

      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        sizeLabel: toSizeLabel(file.size),
        kind: isImage ? "image" : "file",
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        file,
      });
    });

    setAttachments((prev) => [...prev, ...next]);

    let draftId = draft.editingDraftId;
    try {
      draftId = draftId || (await onResolveDraftId(draft.id));
    } catch {
      setValidationError("No se pudo crear el borrador para adjuntar archivos.");
      return;
    }

    for (const item of next) {
      try {
        const uploaded = await onUploadAttachment({ composeId: draft.id, file: item.file, draftId });
        setAttachments((prev) =>
          prev.map((current) =>
            current.id === item.id ? { ...current, serverId: uploaded.id, uploading: false, uploadError: null } : current,
          ),
        );
        onAttachmentUploaded(draft.id, uploaded.id);
      } catch {
        setAttachments((prev) =>
          prev.map((current) =>
            current.id === item.id ? { ...current, uploading: false, uploadError: "No se pudo subir." } : current,
          ),
        );
      }
    }

    if (kind === "file" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (kind === "image" && imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeAttachment = async (id: string) => {
    const current = attachmentsRef.current.find((item) => item.id === id);
    if (current?.serverId) {
      try {
        await onDeleteAttachment(current.serverId);
        onAttachmentRemoved(draft.id, current.serverId);
      } catch {
        setValidationError("No se pudo eliminar el adjunto del servidor.");
      }
    }
    setAttachments((prev) => {
      const found = prev.find((item) => item.id === id);

      if (found?.previewUrl) {
        URL.revokeObjectURL(found.previewUrl);
      }

      return prev.filter((a) => a.id !== id);
    });
  };

  const addRecipientToken = (value: string) => {
    const token = value.trim();

    if (!token) return;

    const normalized = token.toLowerCase();

    setRecipientTokens((prev) => {
      if (prev.some((item) => item.toLowerCase() === normalized)) return prev;

      const next = [...prev, token];

      onToChange(draft.id, next.join(","));

      return next;
    });
  };

  const removeRecipientToken = (token: string) => {
    setRecipientTokens((prev) => {
      const next = prev.filter((item) => item !== token);

      onToChange(draft.id, next.join(","));

      return next;
    });
  };

  const commitDraftRecipients = () => {
    if (!recipientDraft.trim()) return;

    recipientDraft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach(addRecipientToken);

    setRecipientDraft("");
  };

  const getCommittedRecipients = () => {
    const tokens = [
      ...recipientTokens,
      ...recipientDraft
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ];

    return Array.from(new Map(tokens.map((item) => [item.toLowerCase(), item])).values());
  };

  const handleSend = () => {
    setValidationError("");

    const committedRecipients = getCommittedRecipients();

    if (committedRecipients.length === 0) {
      setValidationError("Debe especificar al menos un destinatario");
      return;
    }

    const recipientsValue = committedRecipients.join(",");

    onToChange(draft.id, recipientsValue);
    setRecipientDraft("");

    void onSend(draft.id, {
      to: recipientsValue,
      cc: draft.cc,
      bcc: draft.bcc,
      body: editor?.getHTML() ?? draft.body,
      attachmentIds: draft.attachmentIds ?? [],
      bodyJson: editor?.getJSON() ?? null,
    });
  };

  const insertLink = () => {
    setValidationError("");

    if (!linkName.trim() || !linkUrl.trim()) {
      setValidationError("Nombre y URL son obligatorios para insertar un enlace.");
      return;
    }

    let normalizedUrl = linkUrl.trim();

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      const parsed = new URL(normalizedUrl);

      if (!/^https?:$/.test(parsed.protocol)) {
        setValidationError("La URL debe ser http o https.");
        return;
      }

      if (!editor) return;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: parsed.toString(), target: "_blank", rel: "noopener noreferrer" })
        .insertContent(linkName.trim())
        .unsetLink()
        .run();

      setLinkName("");
      setLinkUrl("");
      setShowLink(false);
    } catch {
      setValidationError("URL inválida.");
    }
  };

  const insertEmoji = (emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
  };

  if (draft.minimized) {
    return (
      <div
        data-compose-modal
        data-compose-id={draft.id}
        className="w-72 cursor-pointer rounded-t-lg border border-border bg-background shadow-compose"
        onClick={() => onToggleMinimize(draft.id)}
      >
        <div className="flex items-center justify-between rounded-t-lg bg-mail-compose px-3 py-2 text-mail-compose-foreground">
          <span className="truncate text-sm font-medium">
            {draft.subject || "Mensaje nuevo"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMinimize(draft.id);
              }}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
            >
              <Maximize2 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(draft.id);
              }}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-compose-modal
      data-compose-id={draft.id}
      className="flex h-[600px] max-h-[calc(100vh-2rem)] w-[min(540px,calc(100vw-2rem))] shrink-0 flex-col rounded-t-lg border border-border bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between rounded-t-lg bg-mail-compose px-4 py-2 text-mail-compose-foreground">
        <span className="text-sm font-medium">
          {draft.editingDraftId
            ? "Editar borrador"
            : draft.mode === "reply"
              ? "Responder"
              : draft.mode === "forward"
                ? "Reenviar"
                : "Mensaje nuevo"}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleMinimize(draft.id)}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
          >
            <Minus className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => onClose(draft.id)}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border bg-transparent px-4 py-2 text-sm"
          onClick={() => recipientInputRef.current?.focus()}
        >
          <span className="text-muted-foreground">Para</span>

          {recipientTokens.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-full bg-mail-surface px-2 py-1 text-xs"
            >
              <span>{token}</span>

              <button
                type="button"
                onClick={() => removeRecipientToken(token)}
                className="rounded p-0.5 hover:bg-mail-hover"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <input
            ref={recipientInputRef}
            type="text"
            placeholder={recipientTokens.length ? "" : "correo@empresa.com"}
            value={recipientDraft}
            onChange={(e) => {
              const value = e.target.value;

              if (value.includes(",")) {
                const [first, ...rest] = value.split(",");

                addRecipientToken(first);
                setRecipientDraft(rest.join(","));
              } else {
                setRecipientDraft(value);
              }
            }}
            onBlur={commitDraftRecipients}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                e.preventDefault();
                commitDraftRecipients();
              } else if (e.key === "Backspace" && !recipientDraft && recipientTokens.length) {
                removeRecipientToken(recipientTokens[recipientTokens.length - 1]);
              }
            }}
            className="min-w-[160px] flex-1 border-0 bg-transparent outline-none"
          />
        </div>

        <input
          type="text"
          placeholder="Cc (opcional): correo1@empresa.com, correo2@empresa.com"
          value={draft.cc}
          onChange={(e) => onCcChange(draft.id, e.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />

        <input
          type="text"
          placeholder="Bcc (opcional): correo1@empresa.com, correo2@empresa.com"
          value={draft.bcc}
          onChange={(e) => onBccChange(draft.id, e.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />

        <input
          type="text"
          placeholder="Asunto"
          value={draft.subject}
          onChange={(e) => onSubjectChange(draft.id, e.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />

        <div
          className="min-h-[180px] flex-1"
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files, "image");
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <EditorContent editor={editor} />
        </div>

        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-3 border-t border-border px-4 py-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "relative rounded-md border border-border p-2",
                  a.kind === "image" ? "w-[150px]" : "inline-flex items-center gap-2 pr-8",
                )}
              >
                {a.kind === "image" && a.previewUrl ? (
                  <img
                    src={a.previewUrl}
                    alt={a.name}
                    className="h-[150px] w-[150px] rounded object-cover"
                  />
                ) : (
                  <>
                    <a href="#" className="text-xs text-mail-accent underline">
                      {a.name}
                    </a>

                    <span className="text-xs text-muted-foreground">{a.sizeLabel}</span>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => void removeAttachment(a.id)}
                  className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-mail-hover"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {validationError ? (
          <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {validationError}
          </div>
        ) : null}

        {draft.error ? (
          <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {draft.error}
          </div>
        ) : null}
      </div>

      <div className="relative flex items-center gap-1 border-t border-border p-2">
        <SystemButton
          onClick={handleSend}
          leftIcon={<Send className="size-4" />}
          className="rounded-full"
        >
          Enviar
        </SystemButton>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Adjuntar archivo"
        >
          <Paperclip className="size-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowLink((v) => !v);
              setShowFormat(false);
              setShowEmoji(false);
              setShowLabels(false);
            }}
            className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
            title="Insertar enlace"
          >
            <LinkIcon className="size-5" />
          </button>

          {showLink ? (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-border bg-popover p-3 shadow-popover">
              <p className="mb-2 text-xs font-medium">Insertar enlace</p>

              <input
                type="text"
                placeholder="Texto a mostrar"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                className="mb-2 w-full rounded border border-border px-2 py-1 text-sm outline-none"
              />

              <input
                type="text"
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="mb-3 w-full rounded border border-border px-2 py-1 text-sm outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLink(false)}
                  className="rounded px-3 py-1 text-sm hover:bg-mail-hover"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={insertLink}
                  className="rounded bg-mail-accent px-3 py-1 text-sm text-mail-accent-foreground"
                >
                  Aceptar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFormat((v) => !v);
              setShowLink(false);
              setShowEmoji(false);
              setShowLabels(false);
            }}
            className={cn(
              "flex size-9 items-center justify-center rounded-full hover:bg-mail-hover",
              showFormat && "bg-mail-hover",
            )}
            title="Formato de texto"
          >
            <Type className="size-5" />
          </button>

          {showFormat ? (
            <div className="absolute bottom-full left-0 z-50 mb-2 flex w-72 flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-2 shadow-popover">
              <select
                onChange={(e) => {
                  if (!editor) return;
                  const size = e.target.value;
                  if (size === "1") editor.chain().focus().setMark("textStyle", { fontSize: "0.8em" }).run();
                  if (size === "3") editor.chain().focus().setMark("textStyle", { fontSize: "1em" }).run();
                  if (size === "5") editor.chain().focus().setMark("textStyle", { fontSize: "1.2em" }).run();
                  if (size === "7") editor.chain().focus().setMark("textStyle", { fontSize: "1.4em" }).run();
                }}
                defaultValue="3"
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="1">Pequeño</option>
                <option value="3">Normal</option>
                <option value="5">Grande</option>
                <option value="7">Enorme</option>
              </select>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={cn("size-8 rounded font-bold hover:bg-mail-hover", editor?.isActive("bold") && "bg-mail-hover")}
              >
                B
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={cn("size-8 rounded italic hover:bg-mail-hover", editor?.isActive("italic") && "bg-mail-hover")}
              >
                I
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={cn("size-8 rounded underline hover:bg-mail-hover", editor?.isActive("underline") && "bg-mail-hover")}
              >
                U
              </button>

              <input
                type="color"
                onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                className="size-8 cursor-pointer rounded"
                title="Color"
              />

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                className={cn("size-8 rounded text-xs hover:bg-mail-hover", editor?.isActive({ textAlign: "left" }) && "bg-mail-hover")}
              >
                L
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                className={cn("size-8 rounded text-xs hover:bg-mail-hover", editor?.isActive({ textAlign: "center" }) && "bg-mail-hover")}
              >
                C
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                className={cn("size-8 rounded text-xs hover:bg-mail-hover", editor?.isActive({ textAlign: "right" }) && "bg-mail-hover")}
              >
                R
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={cn("size-8 rounded text-xs hover:bg-mail-hover", editor?.isActive("bulletList") && "bg-mail-hover")}
              >
                •
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={cn("size-8 rounded text-xs hover:bg-mail-hover", editor?.isActive("orderedList") && "bg-mail-hover")}
              >
                1.
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                className="rounded px-2 py-1 text-xs hover:bg-mail-hover"
              >
                Limpiar
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowFormat(false);
              setShowLink(false);
              setShowLabels(false);
            }}
            className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
            title="Insertar emoji"
          >
            <Smile className="size-5" />
          </button>

          {showEmoji ? (
            <div className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-6 gap-1 rounded-lg border border-border bg-popover p-2 shadow-popover">
              {["😀", "😁", "😂", "😉", "😍", "😎", "🙏", "👍", "👏", "🔥", "✅", "📌"].map(
                (emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="size-8 rounded text-base hover:bg-mail-hover"
                  >
                    {emoji}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Insertar imagen"
        >
          <ImageIcon className="size-5" />
        </button>

        <div className="relative">
          <button
            ref={labelsAnchorRef}
            type="button"
            onClick={() => {
              setShowLabels((v) => !v);
              setShowEmoji(false);
              setShowFormat(false);
              setShowLink(false);
            }}
            className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
            title="Etiquetas"
          >
            <Bookmark className="size-5 rotate-[270deg]" />

            {draft.selectedLabelIds.length > 0 ? (
              <span className="ml-1 text-[10px] font-semibold">
                {draft.selectedLabelIds.length}
              </span>
            ) : null}
          </button>

          <Popover
            open={showLabels}
            onClose={() => setShowLabels(false)}
            anchorRef={labelsAnchorRef}
            placement="top-start"
            offset={8}
            zIndex={10000}
            hideHeader
            className="rounded-lg border border-border bg-popover shadow-popover"
            bodyClassName="p-2 px-0"
          >
            <div className="max-h-[200px] overflow-y-auto pr-1">
              {(labels ?? []).length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No hay etiquetas creadas.
                </p>
              ) : (
                (labels ?? []).map((label) => {
                  const selected = draft.selectedLabelIds.includes(label.id);

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => onToggleLabel(draft.id, label.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md p-1 text-left text-sm hover:bg-mail-hover",
                        selected && "bg-mail-hover",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Bookmark
                          className="size-4 shrink-0 rotate-[270deg]"
                          style={{
                            color: label.color ?? "currentColor",
                            fill: label.color ?? "transparent",
                          }}
                        />

                        <span className="truncate">{label.name}</span>
                      </span>

                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </Popover>
        </div>

        <button
          type="button"
          onClick={() => void onDiscard(draft.id)}
          className="ml-auto flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Descartar borrador"
        >
          <Trash2 className="size-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files, "file");
          }}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files, "image");
          }}
        />
      </div>
    </div>
  );
}
