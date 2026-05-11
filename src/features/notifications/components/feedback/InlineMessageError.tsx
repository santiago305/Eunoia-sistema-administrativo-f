export default function InlineMessageError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 text-xs text-destructive">{text}</p>;
}
