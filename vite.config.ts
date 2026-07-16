import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shouldAnalyzeBundle = process.env.ANALYZE === "true";
const chunkGroups: Array<[string, string[]]> = [
  ["vendor-react", ["react", "react-dom", "react-router-dom", "scheduler", "use-sync-external-store"]],
  ["vendor-ui", ["@radix-ui", "@mui", "@emotion", "lucide-react", "@tabler/icons-react", "react-icons", "sileo", "sonner", "vaul"]],
  ["vendor-echarts", ["echarts", "echarts-for-react"]],
  ["vendor-zrender", ["zrender"]],
  ["vendor-recharts", ["recharts"]],
  ["vendor-d3", ["d3-", "victory-vendor", "internmap", "decimal.js-light"]],
  ["vendor-editor", ["@tiptap", "prosemirror", "linkifyjs"]],
  ["vendor-motion", ["framer", "framer-motion", "motion"]],
  ["vendor-forms", ["react-hook-form", "@hookform", "zod"]],
  ["vendor-dnd", ["@dnd-kit", "@xyflow"]],
  ["vendor-files", ["xlsx", "@react-pdf", "pdfkit", "fontkit", "yoga-layout"]],
  ["vendor-realtime", ["socket.io-client", "engine.io-client"]],
  ["vendor-utils", ["axios", "big.js", "clsx", "class-variance-authority", "tailwind-merge", "dompurify", "js-cookie", "jwt-decode", "next-themes"]],
];

const getManualChunk = (id: string) => {
  if (!id.includes("node_modules")) return undefined;
  const normalizedId = id.replaceAll("\\", "/");
  const match = chunkGroups.find(([, packages]) =>
    packages.some((packageName) => normalizedId.includes(`/node_modules/${packageName}`))
  );

  return match?.[0] ?? "vendor-misc";
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(shouldAnalyzeBundle
      ? [
          visualizer({
            filename: "dist/stats.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/vitest.setup.ts"],
    include: ["test/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    css: true,
  },
});
