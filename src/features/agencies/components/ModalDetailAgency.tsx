import { useEffect, useState, type ReactNode } from "react";
import { Building2, MapPin } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { getAgencyWithSubsidiaries } from "@/shared/services/agencyService";
import { Badge } from "@/shared/components/ui/badge";
import type { AgencyDetail } from "@/features/agencies/types/agencyApi";

type UbigeoNames = {
  departmentsById: Record<string, string>;
  provincesById: Record<string, string>;
  districtsById: Record<string, string>;
};

type Props = {
  open: boolean;
  agencyId: string | null;
  onClose: () => void;
  ubigeoNames: UbigeoNames;
};

function SectionHeader({ icon, title, meta }: { icon: ReactNode; title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-black/60">
        {icon}
        <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">{title}</h4>
      </div>
      {meta ? <span className="text-[11px] text-black/40">{meta}</span> : null}
    </div>
  );
}

function FieldItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50">
      <p className="text-[10px] uppercase tracking-wide text-black/35">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-black/75">{value || "-"}</p>
    </div>
  );
}

export function ModalDetailAgency({ open, agencyId, onClose, ubigeoNames }: Props) {
  const [detail, setDetail] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agencyId) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAgencyWithSubsidiaries(agencyId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setError(parseApiError(err, "No se pudo cargar la agencia."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [agencyId, open]);

  const statusMeta = detail?.isActive
    ? { label: "Activo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    : { label: "Inactivo", className: "border-rose-200 bg-rose-50 text-rose-700" };

  return (
    <Modal open={open} onClose={onClose} title="Detalle de agencia" className="max-h-[70vh]" bodyClassName="p-0 overflow-hidden">
      {!agencyId ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">No hay agencia seleccionada.</div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">Agencia</p>
                    {detail ? (
                      <Badge variant="outline" className={`text-[9px] uppercase tracking-wide ${statusMeta.className}`}>
                        {statusMeta.label}
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">{detail?.name ?? "—"}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-black/45">
                    {(detail?.subsidiaries ?? []).length} sucursal(es)
                  </p>
                </div>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">Cargando detalle...</div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-xs text-rose-600">{error}</div>
          ) : !detail ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">No hay agencia seleccionada.</div>
          ) : (
            <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
              <section>
                <SectionHeader icon={<MapPin className="h-3.5 w-3.5" />} title="Sucursales" meta={`${detail.subsidiaries?.length ?? 0} registrada(s)`} />
                <div className="space-y-2">
                  {(detail.subsidiaries ?? []).map((subsidiary) => {
                    const departmentName = subsidiary.departmentId
                      ? ubigeoNames.departmentsById[subsidiary.departmentId] ?? subsidiary.departmentId
                      : "-";
                    const provinceName = subsidiary.provinceId
                      ? ubigeoNames.provincesById[subsidiary.provinceId] ?? subsidiary.provinceId
                      : "-";
                    const districtName = subsidiary.districtId
                      ? ubigeoNames.districtsById[subsidiary.districtId] ?? subsidiary.districtId
                      : "-";

                    return (
                      <div key={subsidiary.id} className="rounded-lg border border-black/5 p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-black/75">{subsidiary.alias}</p>
                          <Badge
                            variant="outline"
                            className={
                              subsidiary.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                            }
                          >
                            {subsidiary.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <FieldItem label="Departamento" value={departmentName} />
                          <FieldItem label="Provincia" value={provinceName} />
                          <FieldItem label="Distrito" value={districtName} />
                          <FieldItem label="Direccion" value={subsidiary.address ?? "-"} />
                          <FieldItem label="Precio base" value={subsidiary.basePrice} />
                          <FieldItem label="Nota" value={subsidiary.note ?? "-"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
