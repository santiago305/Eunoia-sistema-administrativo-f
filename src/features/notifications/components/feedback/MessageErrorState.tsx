export default function MessageErrorState({
  text = "No se pudieron cargar los mensajes.",
}: {
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm text-destructive">{text}</p>
    </div>
  );
}
