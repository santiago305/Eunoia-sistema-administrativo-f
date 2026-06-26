import { CheckCircle2 } from "lucide-react";
import Purchase from "@/features/purchases/Purchase";

const steps = ["General", "Items", "Documentos", "Pago", "Revisión"];

type Props = {
  poId?: string;
};

export function PurchaseWizard({ poId }: Props) {
  return (
    <div className="space-y-4">
      <nav aria-label="Flujo de compra" className="grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step} className="flex min-h-11 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/65">
            <CheckCircle2 className="h-4 w-4 text-black/35" aria-hidden="true" />
            <span className="truncate">{index + 1}. {step}</span>
          </div>
        ))}
      </nav>
      <Purchase inModal poIdOverride={poId} />
    </div>
  );
}

