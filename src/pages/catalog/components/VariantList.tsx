import { VariantListItem } from "@/types/variant";
import type { CSSProperties } from "react";

export function VariantList({
    variantsLoading,
    variantsError,
    variants,
    primary,
    primaryHover,
    onCreateVariant,
}: {
    variantsLoading: boolean;
    variantsError?: string | null;
    variants: VariantListItem[];
    primary: string;
    primaryHover: string;
    onCreateVariant?: () => void;
}) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <p className="text-sm text-black/70">{variantsLoading ? "Cargando variantes..." : `Total: ${variants.length}`}</p>
                {onCreateVariant && (
                    <button
                        className="rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                        style={{ backgroundColor: primary, borderColor: `${primary}33`, "--tw-ring-color": `${primary}33` } as CSSProperties}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryHover;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = primary;
                        }}
                        onClick={onCreateVariant}
                    >
                        Nueva variante
                    </button>
                )}
            </div>

            {variantsError && <p className="text-sm text-rose-600">{variantsError}</p>}

            {!variantsLoading && variants.length === 0 && !variantsError && <p className="text-sm text-black/60">No hay variantes para este producto.</p>}

            {!variantsLoading && variants.length > 0 && (
                <div className="max-h-72 overflow-auto rounded-2xl border border-black/10">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white text-xs text-black/60">
                            <tr className="border-b border-black/10">
                                <th className="py-3 text-left px-4">SKU</th>
                                <th className="py-3 text-left px-4">ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map((variant, idx) => {
                                const sku = String(variant.sku ?? variant.code ?? "-");
                                const id = String(variant.id ?? variant.variant_id ?? idx + 1);
                                return (
                                    <tr key={`${id}-${idx}`} className="border-b border-black/5">
                                        <td className="py-3 px-4">{sku}</td>
                                        <td className="py-3 px-4 text-black/60">{id}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
