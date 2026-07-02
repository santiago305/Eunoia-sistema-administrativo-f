export function formatDate(
  value: string | null | undefined,
): string {
  if (!value) return "-";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return "-";

  const [, year, month, day] = match;

  return `${day}/${month}/${year.slice(-2)}`;
}