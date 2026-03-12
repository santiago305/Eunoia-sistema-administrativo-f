import type { FormEvent } from "react";

import { UbigeoSelectSection, type UbigeoSelection } from "@/components/UbigeoSelectSection";
import { PrimaryButton } from "@/pages/profile/components/ProfilePrimitives";

import type { CompanyFormErrors, CompanyFormValues } from "../types/companyFormTypes";

type CompanyFormSectionProps = {
    formValues: CompanyFormValues;
    formErrors: CompanyFormErrors;
    ubigeoSelection: UbigeoSelection;
    loading: boolean;
    saving: boolean;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFieldChange: <K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) => void;
    onUbigeoChange: (next: UbigeoSelection) => void;
};

export function CompanyFormSection({ formValues, formErrors, ubigeoSelection, loading, saving, onSubmit, onFieldChange, onUbigeoChange }: CompanyFormSectionProps) {
    return (
        <form onSubmit={onSubmit} className="p-5 pt-0 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs">
                    Razon social
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Nombre de la empresa"
                        value={formValues.name}
                        onChange={(e) => onFieldChange("name", e.target.value)}
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                </label>
                <label className="text-xs">
                    RUC
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Numero de RUC"
                        value={formValues.ruc}
                        onChange={(e) => onFieldChange("ruc", e.target.value)}
                    />
                    {formErrors.ruc && <p className="mt-1 text-xs text-red-600">{formErrors.ruc}</p>}
                </label>
            </div>

            <div className="space-y-2">
                <UbigeoSelectSection value={ubigeoSelection} onChange={onUbigeoChange} disabled={saving || loading} showUbigeoInput className="h-9" textSize="text-xs mt-1" />
                {(formErrors.department || formErrors.province || formErrors.district || formErrors.ubigeo) && (
                    <p className="text-xs font-semibold text-red-500">{formErrors.department || formErrors.province || formErrors.district || formErrors.ubigeo}</p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs">
                    Urbanizacion
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.urbanization ?? ""}
                        onChange={(e) => onFieldChange("urbanization", e.target.value)}
                    />
                    {formErrors.urbanization && <p className="mt-1 text-xs text-red-600">{formErrors.urbanization}</p>}
                </label>
                <label className="text-xs">
                    Direccion
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.address ?? ""}
                        onChange={(e) => onFieldChange("address", e.target.value)}
                    />
                    {formErrors.address && <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>}
                </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs">
                    Telefono
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.phone ?? ""}
                        onChange={(e) => onFieldChange("phone", e.target.value)}
                    />
                    {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                </label>
                <label className="text-xs">
                    Correo
                    <input
                        type="email"
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.email ?? ""}
                        onChange={(e) => onFieldChange("email", e.target.value)}
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-xs">
                    Codigo local
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.codLocal ?? ""}
                        onChange={(e) => onFieldChange("codLocal", e.target.value)}
                    />
                    {formErrors.codLocal && <p className="mt-1 text-xs text-red-600">{formErrors.codLocal}</p>}
                </label>
                <label className="text-xs">
                    SOL Usuario
                    <input
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.solUser ?? ""}
                        onChange={(e) => onFieldChange("solUser", e.target.value)}
                    />
                    {formErrors.solUser && <p className="mt-1 text-xs text-red-600">{formErrors.solUser}</p>}
                </label>
                <label className="text-xs">
                    SOL Clave
                    <input
                        type="password"
                        className="mt-2 h-9 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                        placeholder="Opcional"
                        value={formValues.solPass ?? ""}
                        onChange={(e) => onFieldChange("solPass", e.target.value)}
                    />
                    {formErrors.solPass && <p className="mt-1 text-xs text-red-600">{formErrors.solPass}</p>}
                </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-black/70">
                    <input type="radio" name="production-mode" checked={!formValues.production} onChange={() => onFieldChange("production", false)} />
                    Prueba
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-black/70">
                    <input type="radio" name="production-mode" checked={Boolean(formValues.production)} onChange={() => onFieldChange("production", true)} />
                    Produccion
                </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-black/50">{loading ? "Cargando datos..." : "Actualiza lo necesario y guarda los cambios."}</p>

                <PrimaryButton type="submit" disabled={saving || loading}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                </PrimaryButton>
            </div>
        </form>
    );
}
