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
import type { MailLabelItem } from "../types/message.types";
import { SystemButton } from "../../../shared/components/components/SystemButton";
import { Popover } from "@/shared/components/modales/Popover";

type AttachmentItem = {
  id: string;
  name: string;
  sizeLabel: string;
  kind: "image" | "file";
  previewUrl?: string;
  file: File;
};

interface Props {
  open: boolean;
  minimized: boolean;
  editingDraft: boolean;
  recipients: string;
  subject: string;
  body: string;
  error?: string;
  onToggleMinimize: () => void;
  onClose: () => void;
  onRecipientsChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  labels?: MailLabelItem[];
  selectedLabelIds?: string[];
  onToggleLabel?: (labelId: string) => void;
  onSend: () => void | Promise<void>;
  onSaveDraft: () => void | Promise<void>;
}

export default function NotificationComposeModal(props: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
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
    if (bodyRef.current && bodyRef.current.innerHTML !== props.body) {
      bodyRef.current.innerHTML = props.body;
    }
  }, [props.body]);

  useEffect(() => {
    const tokens = props.recipients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setRecipientTokens(tokens);
  }, [props.recipients]);

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

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);

    if (bodyRef.current) {
      props.onBodyChange(bodyRef.current.innerHTML);
    }
  };

  const handleSend = () => {
    setValidationError("");

    commitDraftRecipients();

    const recipients = [
      ...recipientTokens,
      ...recipientDraft
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ];

    const uniqueRecipients = Array.from(
      new Map(recipients.map((item) => [item.toLowerCase(), item])).values(),
    );

    if (uniqueRecipients.length === 0) {
      setValidationError("Debe especificar al menos un destinatario");
      return;
    }

    props.onRecipientsChange(uniqueRecipients.join(","));

    window.setTimeout(() => {
      void props.onSend();
    }, 0);
  };

  const toSizeLabel = (size: number) => `${Math.max(1, Math.round(size / 1024))} KB`;

  const addFiles = (files: FileList | null, kind: "image" | "file") => {
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

    if (kind === "file" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (kind === "image" && imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const current = prev.find((item) => item.id === id);

      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
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

      props.onRecipientsChange(next.join(","));

      return next;
    });
  };

  const removeRecipientToken = (token: string) => {
    setRecipientTokens((prev) => {
      const next = prev.filter((item) => item !== token);

      props.onRecipientsChange(next.join(","));

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

      const html = `<a href="${parsed.toString()}" target="_blank" rel="noopener noreferrer">${linkName.trim()}</a> `;

      exec("insertHTML", html);

      setLinkName("");
      setLinkUrl("");
      setShowLink(false);
    } catch {
      setValidationError("URL inválida.");
    }
  };

  const insertEmoji = (emoji: string) => {
    exec("insertText", emoji);
  };

  if (!props.open) return null;

  if (props.minimized) {
    return (
      <div
        data-compose-modal
        className="w-72 cursor-pointer rounded-t-lg border border-border bg-background shadow-compose"
        onClick={props.onToggleMinimize}
      >
        <div className="flex items-center justify-between rounded-t-lg bg-mail-compose px-3 py-2 text-mail-compose-foreground">
          <span className="truncate text-sm font-medium">
            {props.subject || "Mensaje nuevo"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleMinimize();
              }}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
            >
              <Maximize2 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onClose();
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
      className="flex h-[600px] max-h-[calc(100vh-2rem)] w-[min(540px,calc(100vw-2rem))] flex-col rounded-t-lg border border-border bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between rounded-t-lg bg-mail-compose px-4 py-2 text-mail-compose-foreground">
        <span className="text-sm font-medium">
          {props.editingDraft ? "Editar borrador" : "Mensaje nuevo"}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={props.onToggleMinimize}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
          >
            <Minus className="size-4" />
          </button>

          <button
            type="button"
            onClick={props.onClose}
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
          placeholder="Asunto"
          value={props.subject}
          onChange={(e) => props.onSubjectChange(e.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />

        <div
          ref={bodyRef}
          contentEditable
          onInput={(e) => props.onBodyChange((e.target as HTMLDivElement).innerHTML)}
          className="min-h-[180px] flex-1 overflow-y-auto px-4 py-3 text-sm outline-none"
          suppressContentEditableWarning
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files, "image");
          }}
          onDragOver={(e) => e.preventDefault()}
        />

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
                  onClick={() => removeAttachment(a.id)}
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

        {props.error ? (
          <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {props.error}
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
                onChange={(e) => exec("fontSize", e.target.value)}
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
                onClick={() => exec("bold")}
                className="size-8 rounded font-bold hover:bg-mail-hover"
              >
                B
              </button>

              <button
                type="button"
                onClick={() => exec("italic")}
                className="size-8 rounded italic hover:bg-mail-hover"
              >
                I
              </button>

              <button
                type="button"
                onClick={() => exec("underline")}
                className="size-8 rounded underline hover:bg-mail-hover"
              >
                U
              </button>

              <input
                type="color"
                onChange={(e) => exec("foreColor", e.target.value)}
                className="size-8 cursor-pointer rounded"
                title="Color"
              />

              <button
                type="button"
                onClick={() => exec("justifyLeft")}
                className="size-8 rounded text-xs hover:bg-mail-hover"
              >
                L
              </button>

              <button
                type="button"
                onClick={() => exec("justifyCenter")}
                className="size-8 rounded text-xs hover:bg-mail-hover"
              >
                C
              </button>

              <button
                type="button"
                onClick={() => exec("justifyRight")}
                className="size-8 rounded text-xs hover:bg-mail-hover"
              >
                R
              </button>

              <button
                type="button"
                onClick={() => exec("insertUnorderedList")}
                className="size-8 rounded text-xs hover:bg-mail-hover"
              >
                •
              </button>

              <button
                type="button"
                onClick={() => exec("insertOrderedList")}
                className="size-8 rounded text-xs hover:bg-mail-hover"
              >
                1.
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

            {(props.selectedLabelIds?.length ?? 0) > 0 ? (
              <span className="ml-1 text-[10px] font-semibold">
                {props.selectedLabelIds?.length}
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
              {(props.labels ?? []).length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No hay etiquetas creadas.
                </p>
              ) : (
                (props.labels ?? []).map((label) => {
                  const selected = Boolean(props.selectedLabelIds?.includes(label.id));

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => props.onToggleLabel?.(label.id)}
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
          onClick={props.onClose}
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
          onChange={(e) => addFiles(e.target.files, "file")}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files, "image")}
        />
      </div>
    </div>
  );
}