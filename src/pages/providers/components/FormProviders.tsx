import { SupplierForm } from "@/pages/providers/types/supplier";
import { FileText, Search } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { DocumentType } from "@/pages/providers/types/DocumentType";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";

const documentTypeOptions = [
  { value: DocumentType.DNI, label: "DNI" },
  { value: DocumentType.RUC, label: "RUC" },
  { value: DocumentType.CE, label: "CE" },
];

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

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
    <div className="space-y-4 overflow-auto bg-white flex flex-col max-h-[calc(100vh-100px)]
     min-h-[calc(100vh-100px) p-6">
      <div className="border-b border-black/10 px-3 sm:px-4 py-1">
        <SectionHeaderForm icon={FileText} title="Datos de documento" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-2 space-y-2">
        <FloatingSelect
          label="Tipo de documento"
          name="supplier-document-type"
          value={form.documentType}
          options={documentTypeOptions}
          onChange={(value) => {
            setForm((prev) => ({ ...prev, documentType: value as DocumentType }));
          }}
          className="h-9 text-xs"
        />
        <div className="flex items-end gap-2 space-y-2">
          <FloatingInput
            label="Número de documento"
            name="supplier-document-number"
            value={form.documentNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, documentNumber: e.target.value }))}
            className="h-9 text-xs"
          />
          {form.documentType !== DocumentType.CE && (
            <SystemButton
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onLookupIdentity}
              disabled={lookupDisabled}
              title="Buscar identidad"
              style={{ borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
            >
              <Search className="h-4 w-4" />
            </SystemButton>
          )}
        </div>
      </div>
      {(form.documentType === DocumentType.DNI || form.documentType === DocumentType.CE) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 space-y-2">
          <FloatingInput
            label="Nombre"
            name="supplier-name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="h-9 text-xs"
          />
          <FloatingInput
            label="Apellido"
            name="supplier-last-name"
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            className="h-9 text-xs"
          />
        </div>
      )}
      {form.documentType === DocumentType.RUC && (
        <FloatingInput
          label="Razón social / Nombre comercial"
          name="supplier-trade-name"
          value={form.tradeName}
          onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
          className="h-9 text-xs"
        />
      )}
      <FloatingInput
        label="Dirección"
        name="supplier-address"
        value={form.address}
        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        className="h-9 text-xs"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 space-y-2">
        <FloatingInput
          label="Teléfono"
          name="supplier-phone"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="h-9 text-xs"
        />
        <FloatingInput
          label="Correo"
          name="supplier-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="h-9 text-xs"
        />
      </div>



      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FloatingInput
          label="Tiempo de espera (días)"
          name="supplier-lead-time"
          type="number"
          min="0"
          step="1"
          value={form.leadTimeDays}
          onChange={(e) => setForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
          className="h-9 text-xs"
        />
        <FloatingSelect
          label="Estado"
          name="supplier-status"
          value={form.isActive ? "active" : "inactive"}
          options={statusOptions}
          onChange={(value) => setForm((prev) => ({ ...prev, isActive: value === "active" }))}
          className="h-9 text-xs"
        />
      </div>
    </div>
  );
}


