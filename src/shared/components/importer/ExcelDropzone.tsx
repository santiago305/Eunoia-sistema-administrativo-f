import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/shared/lib/utils";

type ExcelDropzoneProps = {
  file: File | null;
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function ExcelDropzone({ file, disabled, onFile }: ExcelDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    disabled,
    maxFiles: 1,
    multiple: false,
    onDrop: (acceptedFiles) => {
      const nextFile = acceptedFiles[0];
      if (nextFile) onFile(nextFile);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        isDragActive && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input {...getInputProps()} />
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {isDragActive ? "Suelta el archivo aquí" : "Arrastra tu Excel o haz clic para subirlo"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Formatos permitidos: .xlsx y .xls</p>
      {file ? (
        <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
          {file.name}
        </div>
      ) : null}
    </div>
  );
}
