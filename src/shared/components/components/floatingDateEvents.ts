export const CLOSE_ALL_FLOATING_DATES_EVENT = "floating-date:close-all";

type CloseAllFloatingDatesDetail = {
  sourceId?: string;
};

export function dispatchCloseAllFloatingDates(sourceId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<CloseAllFloatingDatesDetail>(
      CLOSE_ALL_FLOATING_DATES_EVENT,
      {
        detail: { sourceId },
      },
    ),
  );
}