export const DEFAULT_COMPANY_PRIMARY_COLOR = "#21B5A6";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function normalizeCompanyPrimaryColor(color?: string | null): string {
  const normalized = color?.trim();
  return normalized && HEX_COLOR_PATTERN.test(normalized)
    ? normalized.toUpperCase()
    : DEFAULT_COMPANY_PRIMARY_COLOR;
}

function hexToHslChannels(color: string) {
  const normalized = normalizeCompanyPrimaryColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue) hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  const saturation = delta === 0
    ? 0
    : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    hue: Math.round(hue),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
    red,
    green,
    blue,
  };
}

function getContrastingForeground(red: number, green: number, blue: number) {
  const linearize = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue);

  return luminance > 0.45 ? "0 0% 0%" : "0 0% 100%";
}

export function applyCompanyTheme(color?: string | null): string {
  const normalized = normalizeCompanyPrimaryColor(color);
  const { hue, saturation, lightness, red, green, blue } =
    hexToHslChannels(normalized);
  const primary = `${hue} ${saturation}% ${lightness}%`;
  const foreground = getContrastingForeground(red, green, blue);
  const root = document.documentElement;

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--accent", `${hue} ${saturation}% 95%`);
  root.style.setProperty("--accent-foreground", `${hue} ${saturation}% 20%`);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--sidebar-ring", primary);

  return normalized;
}
