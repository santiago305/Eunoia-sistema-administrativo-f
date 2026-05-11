export default function MessageEmptyState({ text = "No tienes mensajes en esta bandeja." }: { text?: string }) {
  return <div className="p-4 text-sm text-muted-foreground">{text}</div>;
}
