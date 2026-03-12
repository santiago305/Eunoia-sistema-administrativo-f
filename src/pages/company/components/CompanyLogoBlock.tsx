import { getInitial } from "@/pages/profile/components";
import { useState, useEffect } from "react";

type CompanyLogoBlockProps = {
  loading: boolean;
  name: string;
  logoUrl: string;
  onPickLogo: (file: File) => void;
  onPickCert: (file: File) => void;
  disabled?: boolean;
  certDisabled?: boolean;
  COMPANY_PRIMARY:string;
};

export function CompanyLogoBlock({
  loading,
  name,
  logoUrl,
  onPickLogo,
  onPickCert,
  disabled,
  certDisabled,
  COMPANY_PRIMARY
}: CompanyLogoBlockProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasLogo = Boolean(logoUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
        {hasLogo ? (
          <img
            src={logoUrl}
            alt="Logo de empresa"
            className="h-full w-full object-cover object-center"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-2xl font-bold text-white"
            style={{ backgroundColor: COMPANY_PRIMARY }}
            aria-label="Logo inicial"
          >
            {getInitial(name)}
          </div>
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold">{loading ? "Cargando..." : name}</p>
        <p className="text-xs text-black/60">PNG/JPG. Recomendado: cuadrado, buena luz.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={[
              "inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/80",
              "transition active:scale-[0.99]",
              disabled ? "opacity-60 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {disabled ? "Subiendo..." : "Subir logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickLogo(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <label
            className={[
              "inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/80",
              "transition active:scale-[0.99]",
              certDisabled ? "opacity-60 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {certDisabled ? "Subiendo..." : "Subir certificado"}
            <input
              type="file"
              accept=".pfx,.p12,.pem,.crt,.cer"
              className="hidden"
              disabled={certDisabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickCert(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
