export const formatRelativeTime = (value?: Date | string | null, now = Date.now()) => {
  if (!value) return 'sin fecha';

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return 'sin fecha';

  const diffMs = Math.max(0, now - timestamp);
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 10) return 'justo ahora';
  if (diffSeconds < 60) return `hace ${diffSeconds} s`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) return 'hace 1 min';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'hace 1 h';
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'hace 1 dia';
  return `hace ${diffDays} dias`;
};
