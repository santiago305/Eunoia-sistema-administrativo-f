import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTableSearchBar, DataTableSearchChips } from "@/shared/components/table/search";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { listSuppliers } from "@/shared/services/supplierService";
import {
  cancelRecurringPurchase,
  createRecurringPurchase,
  generateCurrentRecurringPayable,
  listRecurringPurchases,
  pauseRecurringPurchase,
  resumeRecurringPurchase,
} from "@/shared/services/recurringPurchaseService";
import { RecurringPurchaseFormModal } from "../components/recurrent/RecurringPurchaseFormModal";
import { RecurringPurchasePaymentModal } from "../components/recurrent/RecurringPurchasePaymentModal";
import { RecurringPurchaseSmartSearchPanel } from "../components/recurrent/RecurringPurchaseSmartSearchPanel";
import { RecurringPurchaseTable } from "../components/recurrent/RecurringPurchaseTable";
import type {
  CreateRecurringPurchasePayload,
  ListRecurringPurchasesResponse,
  RecurringPurchase,
  RecurringPurchaseSearchCatalogs,
  RecurringPurchaseSearchRule,
  RecurringPurchaseSearchSnapshot,
} from "../types/recurring-purchase.types";
import {
  buildRecurringPurchaseSearchChips,
  buildRecurringPurchaseSmartSearchColumns,
  createEmptyRecurringPurchaseSearchFilters,
  removeRecurringPurchaseSearchKey,
  sanitizeRecurringPurchaseSearchSnapshot,
  upsertRecurringPurchaseSearchRule,
  type RecurringPurchaseSearchFilterKey,
} from "../utils/recurringPurchaseSmartSearch";

const DEFAULT_LIMIT = 25;

export default function RecurringPurchasesPage() {
  const { showFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<RecurringPurchase | null>(null);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyRecurringPurchaseSearchFilters());
  const [supplierOptions, setSupplierOptions] = useState<RecurringPurchaseSearchCatalogs["suppliers"]>([]);
  const [items, setItems] = useState<RecurringPurchase[]>([]);
  const [pagination, setPagination] = useState<Pick<ListRecurringPurchasesResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const catalogs = useMemo<RecurringPurchaseSearchCatalogs>(
    () => ({ suppliers: supplierOptions }),
    [supplierOptions],
  );

  const draftSnapshot = useMemo(
    () => sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () => sanitizeRecurringPurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const smartSearchColumns = useMemo(
    () => buildRecurringPurchaseSmartSearchColumns(catalogs),
    [catalogs],
  );

  const searchChips = useMemo(
    () => buildRecurringPurchaseSearchChips(executedSnapshot, catalogs),
    [catalogs, executedSnapshot],
  );

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await listSuppliers({ page: 1, limit: 100 });
      setSupplierOptions(
        (response.items ?? []).map((supplier) => {
          const personName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
          return {
            id: supplier.supplierId,
            label: supplier.tradeName || personName || supplier.documentNumber || supplier.supplierId,
          };
        }),
      );
    } catch {
      setSupplierOptions([]);
    }
  }, []);

  const loadRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRecurringPurchases({
        page: pagination.page,
        limit: DEFAULT_LIMIT,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setItems([]);
      showFeedback(errorResponse("No se pudo cargar compras recurrentes."));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, pagination.page, showFeedback]);

  useEffect(() => {
    void loadRecurring();
  }, [loadRecurring]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const submitSearch = useCallback(() => {
    setAppliedSearchText(searchText.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const applySmartSnapshot = useCallback((snapshot: RecurringPurchaseSearchSnapshot) => {
    const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
    setSearchText(normalized.q ?? "");
    setAppliedSearchText(normalized.q ?? "");
    setSearchFilters(normalized.filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleApplySearchRule = useCallback((rule: RecurringPurchaseSearchRule) => {
    setSearchFilters((current) => {
      const next = upsertRecurringPurchaseSearchRule(
        sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: current }),
        rule,
      );
      return next.filters;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: RecurringPurchaseSearchFilterKey) => {
    setSearchFilters((current) => {
      const next = removeRecurringPurchaseSearchKey(
        sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: current }),
        fieldId,
      );
      return next.filters;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | RecurringPurchaseSearchFilterKey) => {
    const nextSnapshot = removeRecurringPurchaseSearchKey(
      sanitizeRecurringPurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    setSearchText(nextSnapshot.q ?? "");
    setAppliedSearchText(nextSnapshot.q ?? "");
    setSearchFilters(nextSnapshot.filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [appliedSearchText, searchFilters]);

  const createTemplate = async (payload: CreateRecurringPurchasePayload) => {
    try {
      await createRecurringPurchase(payload);
      showFeedback(successResponse("Compra recurrente creada."));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo crear la compra recurrente."));
    }
  };

  const runAction = async (
    item: RecurringPurchase,
    action: (id: string) => Promise<unknown>,
    successMessage: string,
    errorMessage: string,
  ) => {
    try {
      await action(item.recurringPurchaseTemplateId);
      showFeedback(successResponse(successMessage));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse(errorMessage));
    }
  };

  const generatePayable = async (item: RecurringPurchase) => {
    try {
      const result = await generateCurrentRecurringPayable(item.recurringPurchaseTemplateId);
      showFeedback(
        successResponse(
          result.generated
            ? "Cuenta por pagar generada."
            : "La cuenta del periodo ya fue generada o aun no vence.",
        ),
      );
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo generar la cuenta por pagar."));
    }
  };

  return (
    <PageShell>
      <PageTitle title="Compras recurrentes" />
      <div className="flex flex-col gap-4">
        <PageActionsRow>
          {can("recurring_purchases.create") ? (
            <SystemButton onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva recurrente
            </SystemButton>
          ) : null}
        </PageActionsRow>

        <DataTableSearchChips
          chips={searchChips}
          onRemove={(chip) => handleRemoveChip(chip.removeKey)}
        />

        <RecurringPurchaseTable
          items={items}
          loading={loading}
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPause={(item) =>
            void runAction(item, pauseRecurringPurchase, "Recurrencia pausada.", "No se pudo pausar.")
          }
          onResume={(item) =>
            void runAction(item, resumeRecurringPurchase, "Recurrencia reanudada.", "No se pudo reanudar.")
          }
          onCancel={(item) =>
            void runAction(item, cancelRecurringPurchase, "Recurrencia cancelada.", "No se pudo cancelar.")
          }
          onGenerate={(item) => void generatePayable(item)}
          onRegisterPayment={(item) => setPaymentTarget(item)}
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmitSearch={submitSearch}
              searchLabel="Busca recurrente"
              searchName="recurring-purchase-smart-search"
            >
              <RecurringPurchaseSmartSearchPanel
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                catalogs={catalogs}
                filterQuery={searchText}
                onApplySnapshot={applySmartSnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
              />
            </DataTableSearchBar>
          }
          permissions={{
            canPause: can("recurring_purchases.pause"),
            canCancel: can("recurring_purchases.cancel"),
            canGenerate: can("recurring_purchases.pay"),
            canRegisterPayment: can("recurring_purchases.register_payment"),
          }}
        />
      </div>

      <RecurringPurchaseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createTemplate}
      />

      <RecurringPurchasePaymentModal
        open={Boolean(paymentTarget)}
        item={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSaved={() => {
          showFeedback(successResponse("Pago recurrente registrado."));
          void loadRecurring();
        }}
        canUploadEvidence={can("recurring_purchases.upload_payment_evidence")}
      />
    </PageShell>
  );
}
