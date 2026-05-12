import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Send, Type } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import InlineMessageError from "../feedback/InlineMessageError";

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

  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== props.body) {
      bodyRef.current.innerHTML = props.body;
    }
  }, [props.body]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (bodyRef.current) props.onBodyChange(bodyRef.current.innerHTML);
  };

  const insertLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    const html = `<a href="${linkUrl}" target="_blank" class="underline text-blue-600">${linkName}</a> `;
    exec("insertHTML", html);
    setLinkName("");
    setLinkUrl("");
    setShowLink(false);
  };

  if (!props.open) return null;

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 w-[560px] rounded-xl border bg-background shadow-2xl", props.minimized ? "h-12" : "")}>
      <div className="flex items-center justify-between rounded-t-xl border-b bg-zinc-800 px-3 py-2 text-zinc-50">
        <p className="text-sm font-medium">{props.editingDraft ? "Editar borrador" : "Mensaje nuevo"}</p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" className="h-7 w-7 p-0 text-zinc-50 hover:bg-zinc-700 hover:text-zinc-50" onClick={props.onToggleMinimize}>
            _
          </Button>
          <Button type="button" variant="ghost" className="h-7 w-7 p-0 text-zinc-50 hover:bg-zinc-700 hover:text-zinc-50" onClick={props.onClose}>
            X
          </Button>
        </div>
      </div>
      {!props.minimized ? (
        <div className="flex min-h-0 flex-col">
          <Input value={props.recipients} onChange={(event) => props.onRecipientsChange(event.target.value)} placeholder="Para" />
          <Input value={props.subject} onChange={(event) => props.onSubjectChange(event.target.value)} placeholder="Asunto" />
          <div
            ref={bodyRef}
            contentEditable
            onInput={(event) => props.onBodyChange((event.target as HTMLDivElement).innerHTML)}
            className="min-h-[220px] max-h-[320px] flex-1 overflow-y-auto px-4 py-3 text-sm outline-none"
            suppressContentEditableWarning
          />
          <div className="border-t px-2 py-2">
            <div className="relative flex items-center gap-2">
              <Button type="button" className="rounded-full" onClick={() => void props.onSend()}>
                <Send className="mr-1 h-4 w-4" />
                Enviar
              </Button>
              <Button type="button" variant="outline" onClick={() => void props.onSaveDraft()}>
                Guardar borrador
              </Button>
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("h-9 w-9 rounded-full p-0", showLink ? "bg-muted" : "")}
                  onClick={() => {
                    setShowLink((value) => !value);
                    setShowFormat(false);
                  }}
                >
                  <LinkIcon className="h-5 w-5" />
                </Button>
                {showLink ? (
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border bg-popover p-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium">Insertar enlace</p>
                    <Input className="mb-2" placeholder="Texto a mostrar" value={linkName} onChange={(event) => setLinkName(event.target.value)} />
                    <Input className="mb-3" placeholder="URL" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowLink(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" size="sm" onClick={insertLink}>
                        Aceptar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("h-9 w-9 rounded-full p-0", showFormat ? "bg-muted" : "")}
                  onClick={() => {
                    setShowFormat((value) => !value);
                    setShowLink(false);
                  }}
                >
                  <Type className="h-5 w-5" />
                </Button>
                {showFormat ? (
                  <div className="absolute bottom-full left-0 z-50 mb-2 flex w-80 flex-wrap items-center gap-1 rounded-lg border bg-popover p-2 shadow-lg">
                    <select
                      onChange={(event) => exec("fontSize", event.target.value)}
                      defaultValue="3"
                      className="h-8 rounded border bg-background px-2 text-sm"
                    >
                      <option value="1">Pequeño</option>
                      <option value="3">Normal</option>
                      <option value="5">Grande</option>
                      <option value="7">Enorme</option>
                    </select>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 font-bold" onClick={() => exec("bold")}>B</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 italic" onClick={() => exec("italic")}>I</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 underline" onClick={() => exec("underline")}>U</Button>
                    <input type="color" onChange={(event) => exec("foreColor", event.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 p-0" />
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-xs" onClick={() => exec("justifyLeft")}>L</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-xs" onClick={() => exec("justifyCenter")}>C</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-xs" onClick={() => exec("justifyRight")}>R</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-xs" onClick={() => exec("insertUnorderedList")}>•</Button>
                    <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-xs" onClick={() => exec("insertOrderedList")}>1.</Button>
                  </div>
                ) : null}
              </div>
              <Button type="button" variant="ghost" className="ml-auto" onClick={props.onClose}>
                Cerrar
              </Button>
            </div>
          </div>
          <InlineMessageError text={props.error} />
        </div>
      ) : null}
    </div>
  );
}
