import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Phone, User } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { getClientById } from "@/shared/services/clientService";
import { CLIENT_TYPE_META } from "@/features/clients/constants/clientType";
import type { ClientDetail } from "@/features/clients/types/clientApi";
import { Badge } from "@/shared/components/ui/badge";
type UbigeoNames = {
  departmentsById: Record<string, string>;
  provincesById: Record<string, string>;
  districtsById: Record<string, string>;
};
type Props = {
  open: boolean;
  clientId: string | null;
  onClose: () => void;
  ubigeoNames: UbigeoNames;
};

function SectionHeader({
  icon,
  title,
  meta,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-black/60">
        {icon}
        <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">
          {title}
        </h4>
      </div>

      {meta ? <span className="text-[11px] text-black/40">{meta}</span> : null}
    </div>
  );
}

function FieldItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50">
      <p className="text-[10px] uppercase tracking-wide text-black/35">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-black/75">
        {value || "-"}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
      {message}
    </div>
  );
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildDocumentLabel = (detail: ClientDetail) => {
  if (detail.docType === "NONE") {
    const ref = (detail.reference ?? "").trim();
    return ref ? `S/D - ${ref}` : "S/D";
  }
  return `${detail.docType} - ${detail.docNumber}`;
};

export function ModalDetailClient({ open, clientId, onClose, ubigeoNames }: Props) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const departmentName = detail?.departmentId
    ? ubigeoNames.departmentsById[detail.departmentId] ?? detail.departmentId
    : "-";

  const provinceName = detail?.provinceId
    ? ubigeoNames.provincesById[detail.provinceId] ?? detail.provinceId
    : "-";

  const districtName = detail?.districtId
    ? ubigeoNames.districtsById[detail.districtId] ?? detail.districtId
    : "-";

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!clientId) {
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
        const response = await getClientById(clientId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setError(parseApiError(err, "No se pudo cargar el cliente."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [clientId, open]);

  const statusMeta = detail?.isActive
  ? {
      label: "Activo",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  : {
      label: "Inactivo",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };

  const docLabel = useMemo(() => (detail ? buildDocumentLabel(detail) : ""), [detail]);
  const clientTypeMeta = detail?.type
  ? CLIENT_TYPE_META[detail.type]
  : null;
  
  const phoneCountLabel = `${(detail?.telephones ?? []).length} teléfono${
    (detail?.telephones ?? []).length === 1 ? "" : "s"
  }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de cliente"
      className="max-h-[70vh]"
      bodyClassName="p-0 overflow-hidden"
    >
      {!clientId ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">
          No hay cliente seleccionado.
        </div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <User className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                      Cliente
                    </p>
                    {detail ? (
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase tracking-wide ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </Badge>
                    ) : null}
                    {clientTypeMeta ? (
                      <Badge
                        variant="outline"
                        className={clientTypeMeta.className}
                      >
                        {clientTypeMeta.label}
                      </Badge>
                    ) : (
                      "-"
                    )}

                  </div>

                  <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">
                    {detail?.fullName ?? "—"}
                  </h3>

                  <p className="mt-0.5 truncate text-[11px] text-black/45">
                    {detail ? docLabel : "—"}
                  </p>
                </div>
              </div>

              {detail ? (
                <div className="shrink-0 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-black/35">
                    Teléfonos
                  </p>
                  <p className="text-xs font-semibold text-black/75">
                    {(detail.telephones ?? []).length}
                  </p>
                </div>
              ) : null}
            </div>
          </header>

          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">
              Cargando detalle...
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-xs text-rose-600">
              {error}
            </div>
          ) : !detail ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">
              No hay cliente seleccionado.
            </div>
          ) : (
            <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
              <section>
                <SectionHeader icon={<User className="h-3.5 w-3.5" />} title="Resumen" />
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldItem label="Departamento" value={departmentName} />
                  <FieldItem label="Provincia" value={provinceName} />
                  <FieldItem label="Distrito" value={districtName} />
                  <FieldItem label="Dirección" value={detail.address ?? "-"} />
                  <FieldItem label="Creación" value={formatDateTime(detail.createdAt)} />
                  <FieldItem label="Actualización" value={formatDateTime(detail.updatedAt)} />
                </div>
              </section>

              <section>
                <SectionHeader
                  icon={<Phone className="h-3.5 w-3.5" />}
                  title="Teléfonos"
                  meta={phoneCountLabel}
                />

                {(detail.telephones ?? []).length ? (
                  <div className="overflow-hidden rounded-md border border-black/5">
                    {(detail.telephones ?? []).map((phoneItem) => (
                      <div
                        key={phoneItem.id}
                        className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-black/80">
                            {phoneItem.number}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {phoneItem.isMain ? (
                              <span className="rounded-md bg-amber-300 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-700">
                                Principal
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No hay teléfonos registrados." />
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

