import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ArrowLeft, MailOpen } from "lucide-react";

interface Props {
  loading: boolean;
  item: any;
  userId?: string;
  replyText: string;
  forwardTo: string;
  forwardText: string;
  onBack: () => void;
  onMarkRead: () => void | Promise<void>;
  onReplyTextChange: (value: string) => void;
  onForwardToChange: (value: string) => void;
  onForwardTextChange: (value: string) => void;
  onReply: () => void | Promise<void>;
  onForward: () => void | Promise<void>;
}

export default function NotificationMailDetail(props: Props) {
  if (props.loading) return <div className="text-sm text-muted-foreground">Cargando detalle...</div>;
  if (!props.item) return <div className="text-sm text-muted-foreground">No se encontro el mensaje.</div>;

  const message = props.item.message ?? props.item;
  const recipient = props.item.recipient ?? null;
  const messageId = String(message?.id ?? "-");
  const recipientId = recipient ? String(recipient.id) : null;
  const thread = Array.isArray(props.item.thread) ? props.item.thread : [message];
  const groupedThread = thread.reduce((acc: any[], current: any) => {
    const key = `${current.senderType ?? "USER"}:${current.senderUserId ?? "system"}`;
    const last = acc[acc.length - 1];
    if (last && last.key === key) {
      last.messages.push(current);
      return acc;
    }
    acc.push({ key, senderType: current.senderType, senderUserId: current.senderUserId, messages: [current] });
    return acc;
  }, []);

  const resolveSenderLabel = (senderType?: string, senderUserId?: string | null) => {
    if (senderType === "SYSTEM") return "Sistema";
    if (senderUserId && props.userId && senderUserId === props.userId) return "Yo";
    return "Usuario";
  };

  return (
    <div className="space-y-4 p-2 md:p-4">
      <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
        <Button type="button" variant="outline" onClick={props.onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        {recipient && !recipient.readAt ? (
          <Button type="button" variant="outline" onClick={() => void props.onMarkRead()} className="gap-2">
            <MailOpen className="size-4" />
            Marcar leido
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-background p-5">
        <h1 className="text-2xl font-semibold">{message.subject ?? "(Sin asunto)"}</h1>
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
          <p>Modulo: {message.originModule ?? "-"} | Estado: {message.status ?? "-"}</p>
          <p>ID mensaje: <span className="font-mono text-foreground/80">{messageId}</span></p>
          {recipientId ? <p>ID destinatario: <span className="font-mono text-foreground/80">{recipientId}</span></p> : null}
        </div>
        <div className="mt-4 rounded-md border bg-muted/20 p-4">
          <p className="text-sm font-medium">Mensaje principal</p>
          {message.bodyHtml ? (
            <div className="mt-2 break-words text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
          ) : (
            <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{message.bodyText ?? ""}</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <p className="mb-2 text-sm font-medium">Conversacion</p>
        <div className="space-y-2">
          {groupedThread.map((group) => (
            <div key={group.key + group.messages[0]?.id} className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">
                {resolveSenderLabel(group.senderType, group.senderUserId)}
              </p>
              {group.messages.map((threadMessage: any) => (
                <div key={threadMessage.id} className="mt-2 first:mt-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(threadMessage.createdAt ?? threadMessage.sentAt ?? Date.now()).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm font-medium">{threadMessage.subject ?? "(Sin asunto)"}</p>
                  {threadMessage.bodyHtml ? (
                    <div
                      className="mt-1 break-words text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: threadMessage.bodyHtml }}
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{threadMessage.bodyText ?? ""}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="mt-3 rounded-md border bg-background p-3">
            <p className="mb-2 text-sm font-medium">Responder al hilo</p>
            <textarea
              className="min-h-24 w-full rounded-md border p-2 text-sm"
              value={props.replyText}
              onChange={(event) => props.onReplyTextChange(event.target.value)}
              placeholder="Escribe tu respuesta..."
            />
            <div className="mt-2">
              <Button type="button" onClick={() => void props.onReply()}>
                Enviar respuesta
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <p className="mb-2 text-sm font-medium">Reenviar</p>
        <Input
          value={props.forwardTo}
          onChange={(event) => props.onForwardToChange(event.target.value)}
          placeholder="correo1@empresa.com, correo2@empresa.com"
        />
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border p-2 text-sm"
          value={props.forwardText}
          onChange={(event) => props.onForwardTextChange(event.target.value)}
          placeholder="Mensaje adicional para reenvio..."
        />
        <div className="mt-2">
          <Button type="button" variant="outline" onClick={() => void props.onForward()}>
            Reenviar
          </Button>
        </div>
      </div>
    </div>
  );
}
