/**
 * Paleta de colores centralizada para gráficos (Charts)
 * Contiene 200 colores armonizados para asegurar variedad visual.
 */
export const CHART_COLORS: string[] = [
  "#0f766e", "#f59e0b", "#22c55e", "#ef4444", "#2563eb", "#f97316", "#14b8a6", "#84cc16",
  "#a855f7", "#ec4899", "#06b6d4", "#8b5cf6", "#f43f5e", "#10b981", "#3b82f6", "#eab308",
  "#6366f1", "#d946ef", "#0891b2", "#4f46e5", "#be185d", "#15803d", "#b45309", "#1d4ed8",
  "#7c3aed", "#db2777", "#0e7490", "#4338ca", "#9d174d", "#166534", "#92400e", "#1e40af",
  "#6d28d9", "#c026d3", "#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1",
  // Generando más variaciones siguiendo patrones estéticos (HSL)
  "#f87171", "#fb923c", "#fbbf24", "#facc15", "#a3e635", "#4ade80", "#34d399", "#2dd4bf",
  "#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6",
  "#fb7185", "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669",
  "#0d9488", "#0891b2", "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3",
  "#db2777", "#e11d48", "#991b1b", "#9a3412", "#92400e", "#854d0e", "#3f6212", "#166534",
  "#065f46", "#115e59", "#155e75", "#075985", "#1e40af", "#3730a3", "#5b21b6", "#6b21a8",
  "#86198f", "#9d174d", "#9f1239", "#7f1d1d", "#7c2d12", "#78350f", "#713f12", "#365314",
  "#14532d", "#064e3b", "#134e4a", "#164e63", "#0c4a6e", "#1e3a8a", "#312e81", "#4c1d95",
  "#581c87", "#701a75", "#831843", "#881337", "#450a0a", "#431407", "#451a03", "#3f2106",
  "#1a2e05", "#052e16", "#022c22", "#062d2d", "#082f49", "#0c4a6e", "#172554", "#1e1b4b",
  "#2e1065", "#3b0764", "#4a044e", "#500724", "#4c0519", "#020617", "#0f172a", "#1e293b",
  "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc",
  // Colores adicionales para completar 200
  "#ff5733", "#33ff57", "#3357ff", "#f333ff", "#33fff3", "#ff33a1", "#a1ff33", "#33a1ff",
  "#ff8c33", "#33ff8c", "#8c33ff", "#ff338c", "#338cff", "#8cff33", "#5733ff", "#ff3357",
  "#33ff33", "#3333ff", "#ff3333", "#ffff33", "#33ffff", "#ff33ff", "#c0c0c0", "#808080",
  "#800000", "#808000", "#008000", "#800080", "#008080", "#000080", "#ff0000", "#ffff00",
  "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffa500", "#a52a2a", "#d2691e", "#ff7f50",
  "#6495ed", "#dc143c", "#00008b", "#008b8b", "#b8860b", "#a9a9a9", "#006400", "#bdb76b",
  "#8b008b", "#556b2f", "#ff8c00", "#9932cc", "#8b0000", "#e9967a", "#8fbc8f", "#483d8b",
  "#2f4f4f", "#00ced1", "#9400d3", "#ff1493", "#00bfff", "#696969", "#1e90ff", "#b22222",
  "#228b22", "#ff00ff", "#ffd700", "#daa520", "#808080", "#008000", "#adff2f", "#ff69b4",
  "#cd5c5c", "#4b0082", "#fffff0", "#f0e68c", "#e6e6fa", "#fff0f5", "#7cfc00", "#fffacd",
  "#add8e6", "#f08080", "#e0ffff", "#fafad2", "#d3d3d3", "#90ee90", "#ffb6c1", "#ffa07a",
  "#20b2aa", "#87cefa", "#778899", "#b0c4de", "#ffffe0", "#00ff00", "#32cd32", "#faf0e6",
  "#ff00ff", "#800000", "#66cdaa", "#0000cd", "#ba55d3", "#9370db", "#3cb371", "#7b68ee",
  "#00fa9a", "#48d1cc", "#c71585", "#191970", "#f5fffa", "#ffe4e1", "#ffe4b5", "#ffdead",
  "#000080", "#fdf5e6", "#808000", "#6b8e23", "#ffa500", "#ff4500", "#da70d6", "#eee8aa",
  "#98fb98", "#afeeee", "#db7093", "#ffefd5", "#ffdab9", "#cd853f", "#ffc0cb", "#dda0dd",
  "#b0e0e6", "#800080", "#663399", "#ff0000", "#bc8f8f", "#4169e1", "#8b4513", "#fa8072",
  "#f4a460", "#2e8b57", "#fff5ee", "#a0522d", "#c0c0c0", "#87ceeb", "#6a5acd", "#708090",
  "#fffafa", "#00ff7f", "#4682b4", "#d2b48c", "#008080", "#d8bfd8", "#ff6347", "#40e0d0"
];

/**
 * Obtiene un color de la paleta por índice, rotando si se excede el límite.
 */
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};
