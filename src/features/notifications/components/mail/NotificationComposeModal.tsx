import { useState, useRef, useEffect } from "react";
import {
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

type AttachmentItem = {
  id: string;
  name: string;
  size: string;
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
  onSend: () => void | Promise<void>;
  onSaveDraft: () => void | Promise<void>;
}

export default function NotificationComposeModal(props: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showFormat, setShowFormat] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== props.body) {
      bodyRef.current.innerHTML = props.body;
    }
  }, [props.body]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (bodyRef.current) props.onBodyChange(bodyRef.current.innerHTML);
  };

  const handleSend = () => {
    setValidationError("");
    const recipients = props.recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (recipients.length === 0) {
      setValidationError("Debe especificar al menos un destinatario");
      return;
    }
    void props.onSend();
  };

  const handleAttach = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAttachments((prev) => [
          ...prev,
          { id: `att-${Date.now()}`, name: file.name, size: `${Math.round(file.size / 1024)} KB` },
        ]);
      }
    };
    input.click();
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const insertLink = () => {
    if (linkName && linkUrl) {
      const html = `<a href="${linkUrl}" target="_blank" class="text-mail-accent underline">${linkName}</a> `;
      exec("insertHTML", html);
      setLinkName("");
      setLinkUrl("");
      setShowLink(false);
    }
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
        <input
          type="text"
          placeholder="Para (separar correos con coma)"
          value={props.recipients}
          onChange={(e) => props.onRecipientsChange(e.target.value)}
          className="px-4 py-2 border-b border-border text-sm outline-none bg-transparent"
        />
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
        />

        {attachments.length > 0 ? (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-mail-surface text-xs">
                <a href="#" className="text-mail-accent underline">{a.name}</a>
                <span className="text-muted-foreground">{a.size}</span>
                <button onClick={() => removeAttachment(a.id)} className="hover:bg-mail-hover rounded-full p-0.5">
                  <X className="size-3" />
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

        <button onClick={handleAttach} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center ml-2" title="Adjuntar archivo">
          <Paperclip className="size-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowLink((v) => !v);
              setShowFormat(false);
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

        <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Insertar emoji">
          <Smile className="size-5" />
        </button>
        <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Insertar imagen">
          <ImageIcon className="size-5" />
        </button>

        <button onClick={props.onClose} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center ml-auto" title="Descartar borrador">
          <Trash2 className="size-5" />
        </button>
      </div>
    </div>
  );
}
