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
import type { MailLabelItem } from "../../types/message.types";

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
    return () => {
      attachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [attachments]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (bodyRef.current) props.onBodyChange(bodyRef.current.innerHTML);
  };

  const handleSend = () => {
    setValidationError("");
    const recipients = recipientTokens;
    if (recipients.length === 0) {
      setValidationError("Debe especificar al menos un destinatario");
      return;
    }
    props.onRecipientsChange(recipients.join(","));
    void props.onSend();
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
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const current = prev.find((item) => item.id === id);
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
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
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
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
      <div className="fixed bottom-0 right-6 z-50 bg-background border border-border rounded-t-lg shadow-compose w-72 cursor-pointer" onClick={props.onToggleMinimize}>
        <div className="flex items-center justify-between px-3 py-2 bg-mail-compose text-mail-compose-foreground rounded-t-lg">
          <span className="text-sm font-medium truncate">{props.subject || "Mensaje nuevo"}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleMinimize();
              }}
              className="size-6 rounded hover:bg-black/10 flex items-center justify-center"
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                props.onClose();
              }}
              className="size-6 rounded hover:bg-black/10 flex items-center justify-center"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-6 z-50 bg-background border border-border rounded-t-lg shadow-compose w-[540px] max-h-[600px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-mail-compose text-mail-compose-foreground rounded-t-lg">
        <span className="text-sm font-medium">{props.editingDraft ? "Editar borrador" : "Mensaje nuevo"}</span>
        <div className="flex items-center gap-1">
          <button onClick={props.onToggleMinimize} className="size-7 rounded hover:bg-black/10 flex items-center justify-center">
            <Minus className="size-4" />
          </button>
          <button onClick={props.onClose} className="size-7 rounded hover:bg-black/10 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div
          className="px-4 py-2 border-b border-border text-sm bg-transparent flex flex-wrap items-center gap-2"
          onClick={() => recipientInputRef.current?.focus()}
        >
          <span className="text-muted-foreground">Para</span>
          {recipientTokens.map((token) => (
            <span key={token} className="inline-flex items-center gap-1 rounded-full bg-mail-surface px-2 py-1 text-xs">
              <span>{token}</span>
              <button type="button" onClick={() => removeRecipientToken(token)} className="rounded hover:bg-mail-hover p-0.5">
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
            className="min-w-[160px] flex-1 border-0 outline-none bg-transparent"
          />
        </div>
        <input
          type="text"
          placeholder="Asunto"
          value={props.subject}
          onChange={(e) => props.onSubjectChange(e.target.value)}
          className="px-4 py-2 border-b border-border text-sm outline-none bg-transparent"
        />

        <div
          ref={bodyRef}
          contentEditable
          onInput={(e) => props.onBodyChange((e.target as HTMLDivElement).innerHTML)}
          className="flex-1 overflow-y-auto px-4 py-3 text-sm outline-none min-h-[180px] max-h-[280px]"
          suppressContentEditableWarning
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files, "image");
          }}
          onDragOver={(e) => e.preventDefault()}
        />

        {attachments.length > 0 ? (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3">
            {attachments.map((a) => (
              <div key={a.id} className={cn("relative rounded-md border border-border p-2", a.kind === "image" ? "w-[150px]" : "inline-flex items-center gap-2 pr-8")}>
                {a.kind === "image" && a.previewUrl ? (
                  <img src={a.previewUrl} alt={a.name} className="w-[150px] h-[150px] object-cover rounded" />
                ) : (
                  <>
                    <a href="#" className="text-mail-accent underline text-xs">{a.name}</a>
                    <span className="text-muted-foreground text-xs">{a.sizeLabel}</span>
                  </>
                )}
                <button onClick={() => removeAttachment(a.id)} className="absolute top-1 right-1 hover:bg-mail-hover rounded-full p-0.5">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {validationError ? <div className="px-4 py-2 text-xs text-destructive bg-destructive/10">{validationError}</div> : null}
        {props.error ? <div className="px-4 py-2 text-xs text-destructive bg-destructive/10">{props.error}</div> : null}
      </div>

      <div className="flex items-center gap-1 px-2 py-2 border-t border-border relative">
        <button onClick={handleSend} className="px-5 py-2 bg-mail-accent text-mail-accent-foreground rounded-full font-medium text-sm hover:opacity-90 flex items-center gap-2">
          <Send className="size-4" />
          Enviar
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center ml-2" title="Adjuntar archivo">
          <Paperclip className="size-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowLink((v) => !v);
              setShowFormat(false);
              setShowEmoji(false);
              setShowLabels(false);
            }}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Insertar enlace"
          >
            <LinkIcon className="size-5" />
          </button>
          {showLink ? (
            <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-lg shadow-popover p-3 w-72 z-50">
              <p className="text-xs font-medium mb-2">Insertar enlace</p>
              <input
                type="text"
                placeholder="Texto a mostrar"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                className="w-full text-sm border border-border rounded px-2 py-1 mb-2 outline-none"
              />
              <input
                type="text"
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full text-sm border border-border rounded px-2 py-1 mb-3 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowLink(false)} className="px-3 py-1 text-sm rounded hover:bg-mail-hover">Cancelar</button>
                <button onClick={insertLink} className="px-3 py-1 text-sm rounded bg-mail-accent text-mail-accent-foreground">Aceptar</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowFormat((v) => !v);
              setShowLink(false);
              setShowEmoji(false);
              setShowLabels(false);
            }}
            className={cn("size-9 rounded-full hover:bg-mail-hover flex items-center justify-center", showFormat && "bg-mail-hover")}
            title="Formato de texto"
          >
            <Type className="size-5" />
          </button>
          {showFormat ? (
            <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-lg shadow-popover p-2 z-50 flex items-center gap-1 flex-wrap w-72">
              <select onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3" className="text-sm border border-border rounded px-2 py-1 bg-background">
                <option value="1">Pequeño</option>
                <option value="3">Normal</option>
                <option value="5">Grande</option>
                <option value="7">Enorme</option>
              </select>
              <button onClick={() => exec("bold")} className="size-8 rounded hover:bg-mail-hover font-bold">B</button>
              <button onClick={() => exec("italic")} className="size-8 rounded hover:bg-mail-hover italic">I</button>
              <button onClick={() => exec("underline")} className="size-8 rounded hover:bg-mail-hover underline">U</button>
              <input type="color" onChange={(e) => exec("foreColor", e.target.value)} className="size-8 cursor-pointer rounded" title="Color" />
              <button onClick={() => exec("justifyLeft")} className="size-8 rounded hover:bg-mail-hover text-xs">L</button>
              <button onClick={() => exec("justifyCenter")} className="size-8 rounded hover:bg-mail-hover text-xs">C</button>
              <button onClick={() => exec("justifyRight")} className="size-8 rounded hover:bg-mail-hover text-xs">R</button>
              <button onClick={() => exec("insertUnorderedList")} className="size-8 rounded hover:bg-mail-hover text-xs">•</button>
              <button onClick={() => exec("insertOrderedList")} className="size-8 rounded hover:bg-mail-hover text-xs">1.</button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowFormat(false);
              setShowLink(false);
              setShowLabels(false);
            }}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Insertar emoji"
          >
            <Smile className="size-5" />
          </button>
          {showEmoji ? (
            <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-lg shadow-popover p-2 z-50 grid grid-cols-6 gap-1">
              {["😀", "😁", "😂", "😉", "😍", "😎", "🙏", "👍", "👏", "🔥", "✅", "📌"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="size-8 rounded hover:bg-mail-hover text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button onClick={() => imageInputRef.current?.click()} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Insertar imagen">
          <ImageIcon className="size-5" />
        </button>
        <div className="relative ml-1">
          <button
            onClick={() => {
              setShowLabels((v) => !v);
              setShowEmoji(false);
              setShowFormat(false);
              setShowLink(false);
            }}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Etiquetas"
          >
            <Bookmark className="size-5 rotate-[270deg]" />
            {(props.selectedLabelIds?.length ?? 0) > 0 ? (
              <span className="ml-1 text-[10px] font-semibold">
                {props.selectedLabelIds?.length}
              </span>
            ) : null}
          </button>
          {showLabels ? (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-popover border border-border rounded-lg shadow-popover p-2">
              <div className="max-h-[200px] overflow-y-auto pr-1">
                {(props.labels ?? []).length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No hay etiquetas creadas.</p>
                ) : (
                  (props.labels ?? []).map((label) => {
                    const selected = Boolean(props.selectedLabelIds?.includes(label.id));
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => props.onToggleLabel?.(label.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-mail-hover",
                          selected && "bg-mail-hover",
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Bookmark
                            className="size-4 shrink-0 rotate-[270deg]"
                            style={{ color: label.color ?? "currentColor", fill: label.color ?? "transparent" }}
                          />
                          <span className="truncate">{label.name}</span>
                        </span>
                        {selected ? <Check className="size-4 shrink-0" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button onClick={props.onClose} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center ml-auto" title="Descartar borrador">
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

