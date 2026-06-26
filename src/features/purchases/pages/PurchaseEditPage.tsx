import { useParams } from "react-router-dom";
import { PageShell } from "@/shared/layouts/PageShell";
import { PurchaseWizard } from "@/features/purchases/components/forms/PurchaseWizard";

export default function PurchaseEditPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <PageShell className="bg-white" contentClassName="max-w-none">
      <PurchaseWizard poId={id} />
    </PageShell>
  );
}
