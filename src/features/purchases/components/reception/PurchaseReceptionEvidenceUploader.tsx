import { Upload } from "lucide-react";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function PurchaseReceptionEvidenceUploader({ value, onChange }: Props) {
  return (
    <div className="rounded-sm border border-black/10 bg-white p-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-black">
        <Upload className="h-4 w-4 text-black/60" />
        Evidencias
      </label>
      <textarea
        className="mt-2 min-h-20 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-xs outline-none transition focus:border-black/30"
        value={value.join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
        placeholder="Una URL o ruta de evidencia por linea"
      />
    </div>
  );
}
