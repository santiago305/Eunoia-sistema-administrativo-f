import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useMessageDetailV2 } from "@/features/notifications/hooks/useMessageDetailV2";
import { useAuth } from "@/shared/hooks/useAuth";

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { item, loading, markRead, reply, forward } = useMessageDetailV2(id);
  const { userId } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardText, setForwardText] = useState("");

  if (loading) return <div className="text-sm text-muted-foreground">Cargando detalle...</div>;
  if (!item) return <div className="text-sm text-muted-foreground">No se encontro el mensaje.</div>;

  const message = item.message ?? item;
  const recipient = item.recipient ?? null;
  const thread = Array.isArray(item.thread) ? item.thread : [message];
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
    if (senderUserId && userId && senderUserId === userId) return "Yo";
    return "Usuario";
  };

  return (
    <div className="space-y-4 p-2 md:p-4">
      <div className="flex items-center justify-between">
        <Link to={RoutesPaths.notifications} className="text-sm underline">
          Volver
        </Link>
        {recipient && !recipient.readAt ? (
          <Button type="button" variant="outline" onClick={() => void markRead()}>
            Marcar leido
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-background p-5">
        <h1 className="text-2xl font-semibold">{message.subject ?? "(Sin asunto)"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Modulo: {message.originModule ?? "-"} | Estado: {message.status ?? "-"}
        </p>
        <div className="mt-4 rounded-md border bg-muted/20 p-4">
          <p className="text-sm font-medium">Mensaje principal</p>
          <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{message.bodyText ?? ""}</div>
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
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{threadMessage.bodyText ?? ""}</p>
                </div>
              ))}
            </div>
          ))}
          <div className="mt-3 rounded-md border bg-background p-3">
            <p className="mb-2 text-sm font-medium">Responder al hilo</p>
            <textarea
              className="min-h-24 w-full rounded-md border p-2 text-sm"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="Escribe tu respuesta..."
            />
            <div className="mt-2">
              <Button
                type="button"
                onClick={async () => {
                  if (!replyText.trim()) return;
                  await reply({ bodyHtml: replyText });
                  setReplyText("");
                }}
              >
                Enviar respuesta
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <p className="mb-2 text-sm font-medium">Reenviar</p>
        <Input
          value={forwardTo}
          onChange={(event) => setForwardTo(event.target.value)}
          placeholder="correo1@empresa.com, correo2@empresa.com"
        />
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border p-2 text-sm"
          value={forwardText}
          onChange={(event) => setForwardText(event.target.value)}
          placeholder="Mensaje adicional para reenvio..."
        />
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (!forwardTo.trim() || !forwardText.trim()) return;
              await forward({ recipients: forwardTo, bodyHtml: forwardText });
              setForwardTo("");
              setForwardText("");
            }}
          >
            Reenviar
          </Button>
        </div>
      </div>
    </div>
  );
}
