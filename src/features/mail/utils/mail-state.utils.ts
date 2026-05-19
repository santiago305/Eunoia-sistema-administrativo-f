type MailDetailLabel = {
  id?: string;
  labelId?: string;
};

type MailDetailLike = {
  labels?: MailDetailLabel[] | unknown;
} | null;

type UnreadCountsLike = {
  inbox: number;
  trash: number;
  archived: number;
  snoozed: number;
};

export const hasAnyUnreadFromSidebarCounts = (counts: UnreadCountsLike): boolean =>
  Number(counts.inbox ?? 0) > 0
  || Number(counts.trash ?? 0) > 0
  || Number(counts.archived ?? 0) > 0
  || Number(counts.snoozed ?? 0) > 0;

export const extractMailDetailLabelIds = (detail: MailDetailLike): string[] => {
  const rawLabels = Array.isArray((detail as { labels?: unknown })?.labels)
    ? ((detail as { labels?: MailDetailLabel[] }).labels ?? [])
    : [];

  return rawLabels
    .map((item) => item?.id ?? item?.labelId)
    .filter((id): id is string => Boolean(id));
};

export const sameStringArray = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);
