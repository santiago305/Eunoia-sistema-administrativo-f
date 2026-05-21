import { Loader2, ShieldCheck } from "lucide-react";
import type { MailMessageActionItem } from "../types/message.types";
import { cn } from "@/shared/lib/utils";

interface Props {
  action: MailMessageActionItem;
  onExecute: (actionId: string) => Promise<void>;
  busy?: boolean;
}

const readActionLabel = (action: MailMessageActionItem) => {
  const rawLabel = action.metadata && typeof action.metadata.label === "string" ? action.metadata.label.trim() : "";
  if (rawLabel) return rawLabel;
  if (action.actionType === "PURCHASE_CONFIRMATION") return "Confirmar compra";
  return "Ejecutar acción";
};

const readCompletedLabel = (action: MailMessageActionItem) => {
  const rawLabel = action.metadata && typeof action.metadata.completedLabel === "string"
    ? action.metadata.completedLabel.trim()
    : "";
  if (rawLabel) return rawLabel;
  return "Acción completada";
};

export default function MailActionBlock({ action, onExecute, busy = false }: Props) {
  const isCompleted = action.status === "COMPLETED";
  const canExecute = action.canExecute && !isCompleted;
  const completedBy = action.completedByName || action.completedByUserId || "otro usuario";

  return (
    <section className="mt-4 rounded-lg border border-border/70 bg-mail-surface px-3 py-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className={cn("mt-0.5 size-4 shrink-0", isCompleted ? "text-emerald-600" : "text-mail-accent")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isCompleted ? readCompletedLabel(action) : readActionLabel(action)}
          </p>
          {isCompleted ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {action.completedAt
                ? `Confirmado por ${completedBy} el ${new Date(action.completedAt).toLocaleString("es-PE")}`
                : `Confirmado por ${completedBy}`}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <button
          type="button"
          disabled={!canExecute || busy}
          onClick={() => void onExecute(action.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition",
            canExecute && !busy
              ? "bg-mail-accent text-white hover:opacity-90"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {isCompleted ? "Completado" : "Confirmar"}
        </button>
      </div>
    </section>
  );
}
