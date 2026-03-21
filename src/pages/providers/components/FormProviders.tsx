import { SupplierForm } from "@/pages/providers/types/supplier";
import { Search, SlidersHorizontal } from "lucide-react";
import { Dispatch, SetStateAction, CSSProperties } from "react";
import { DocumentType } from "@/pages/providers/types/DocumentType";

export function SupplierFormFields({
  form,
  setForm,
  PRIMARY,
  onLookupIdentity,
  lookupDisabled,
}: {
  PRIMARY: string;
  form: SupplierForm;
  setForm: Dispatch<SetStateAction<SupplierForm>>;
  onLookupIdentity: () => void;
  lookupDisabled?: boolean;
}) {
  return (
    <div className="space-y-4 max-h-[500px] overflow-auto">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 overflow-auto">
        <label className="text-xs">
          Tipo de documento
           <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 mt-1 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs appearance-none  bg-white pl-10 pr-9  outline-none focus:ring-2"
                style={{ "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)` } as CSSProperties}
                value={form.documentType}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, documentType: e.target.value  as DocumentType}));
                }}
              >
                <option value="01">DNI</option>
                <option value="06">RUC</option>
                <option value="04">CE</option>
              </select>
            </div>
        </label>
        <label className="text-xs">
          Numero de documento
          <div className="mt-2 flex items-center gap-2">
            <input
              className="h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
              value={form.documentNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, documentNumber: e.target.value }))}
              placeholder=""
            />
            {
              form.documentType != DocumentType.CE &&(
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] disabled:opacity-40"
                  onClick={onLookupIdentity}
                  disabled={lookupDisabled}
                  title="Buscar identidad"
                >
                  <Search className="h-4 w-4" />
                </button>
              )
            }
          </div>
        </label>
      </div>
      {
        (form.documentType === DocumentType.DNI || form.documentType === DocumentType.CE) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs">
            Nombre
            <input
              className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="text-xs">
            Apellido
            <input
              className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </label>
        </div>
        )
      }
      {
        form.documentType === DocumentType.RUC && 
        (
        <div className="mt-2">
          <label className="text-xs">
            Razon social / Nombre comercial
            <input
              className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
              value={form.tradeName}
              onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
            />
          </label>
        </div>
        )
      }
      <div className="mt-2">
        <label className="text-xs">
          Direccion
          <input
            className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs">
          Telefono
          <input
            className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </label>
        <label className="text-xs">
          Correo
          <input
            type="email"
            className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
      </div>

      <label className="text-xs">
        Nota
        <textarea
          className="mt-2 min-h-[55px] w-full rounded-lg border border-black/10 px-3 mb-2 text-xs"
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs">
          Tiempo de espera (dias)
          <input
            type="number"
            min="0"
            step="1"
            className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs"
            value={form.leadTimeDays}
            onChange={(e) => setForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
          />
        </label>
        <label className="text-xs">
          Estado
          <select
            className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs bg-white"
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </label>
      </div>
    </div>
  );
}


