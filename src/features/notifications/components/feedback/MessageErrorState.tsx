import { Button } from "@/shared/components/ui/button";

export default function MessageErrorState({
  text = "No se pudieron cargar los mensajes.",
  onRetry,
}: {
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm text-destructive">{text}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
