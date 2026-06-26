import { PageShell } from "@/shared/layouts/PageShell";
import { PurchaseWizard } from "@/features/purchases/components/forms/PurchaseWizard";

export default function PurchaseCreatePage() {
  return (
    <PageShell className="bg-white" contentClassName="max-w-none">
      <PurchaseWizard />
    </PageShell>
  );
}
