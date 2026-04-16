export const CLOSE_ALL_FLOATING_DATES_EVENT = "floating-date:close-all";

export function dispatchCloseAllFloatingDates() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_ALL_FLOATING_DATES_EVENT));
}