import { useEffect, useState } from "react";
import { getInitial } from "@/pages/profile/components";
import type { CompanyLogoBlockProps } from "@/pages/company/types/companyComponentTypes";

export function CompanyLogoBlock({
  loading,
  name,
  logoUrl,
  certUrl,
  certLabel,
  certLabelMaxChars,
  onPickLogo,
  onPickCert,
  disabled = false,
  certDisabled = false,
  companyPrimary,
}: CompanyLogoBlockProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasLogo = Boolean(logoUrl) && !imageFailed;
  const companyName = loading ? "Cargando..." : name || "Empresa";

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  const resolvedCertLabel = certLabel || "Documento cargado";
  const certLabelText =
    certLabelMaxChars && resolvedCertLabel.length > certLabelMaxChars
      ? `${resolvedCertLabel.slice(0, Math.max(0, certLabelMaxChars - 3))}...`
      : resolvedCertLabel;

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/[0.03]">
        {hasLogo ? (
          <img
            src={logoUrl}
            alt="Logo de empresa"
            className="h-full w-full object-contain object-center p-1"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-3xl font-bold text-white"
            style={{ backgroundColor: companyPrimary }}
            aria-label="Logo inicial"
          >
            {getInitial(companyName)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">
          {companyName}
        </p>

        <p className="mt-1 text-xs leading-5 text-black/55">
          PNG/JPG. Recomendado: cuadrado, buena luz.
        </p>

        {(certLabel || certUrl) && (
          <div className="mt-1">
            <p className="truncate text-xs text-black/45">{certLabelText}</p>

            {certUrl && (
              <a
                href={certUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center text-[11px] font-medium text-primary transition hover:underline"
              >
                Ver certificado
              </a>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={[
              "inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-[11px] font-medium",
              "border border-black/10 bg-white text-black/65",
              "transition hover:bg-black/[0.03] active:scale-[0.99]",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {disabled ? "Subiendo..." : "Subir logo"}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPickLogo(file);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <label
            className={[
              "inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-[11px] font-medium",
              "border border-black/10 bg-white text-black/65",
              "transition hover:bg-black/[0.03] active:scale-[0.99]",
              certDisabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {certDisabled ? "Subiendo..." : "Subir certificado"}

            <input
              type="file"
              accept=".pfx,.p12,.pem,.crt,.cer"
              className="hidden"
              disabled={certDisabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPickCert(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
