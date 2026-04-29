type FlashType = "error" | "success" | "warning" | "info";

export function flashMessage(type: FlashType, message: string) {
  const event = new CustomEvent(`flash:${type}`, { detail: message });
  window.dispatchEvent(event);
}


