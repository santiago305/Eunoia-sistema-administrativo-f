import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus, UserCheck, UserX } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useAuth } from "@/shared/hooks/useAuth";
import {
    createAdviser,
    listAdvisers,
    type AdviserOption,
} from "@/shared/services/adviserService";
import { listUsers } from "@/shared/services/userService";

export type SaleOrderBulkAssignModalProps = {
    open: boolean;
    selectedCount: number;
    loading?: boolean;
    onClose: () => void;
    onSubmit: (assignedBy: string | null) => void | Promise<void>;
};

export function SaleOrderBulkAssignModal({
    open,
    selectedCount,
    loading = false,
    onClose,
    onSubmit,
}: SaleOrderBulkAssignModalProps) {
    const { permissions = [] } = useAuth();
    const canAssignRoles =
        Array.isArray(permissions) && permissions.includes("users.assign_roles");

    const [advisers, setAdvisers] = useState<AdviserOption[]>([]);
    const [selectedAdviserId, setSelectedAdviserId] = useState("");
    const [loadingAdvisers, setLoadingAdvisers] = useState(false);
    const [error, setError] = useState("");
    const requestIdRef = useRef(0);

    const [addAdviserOpen, setAddAdviserOpen] = useState(false);
    const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [savingAdviser, setSavingAdviser] = useState(false);
    const [addError, setAddError] = useState("");

    const adviserIds = useMemo(
        () => new Set(advisers.map((adviser) => adviser.id)),
        [advisers],
    );

    useEffect(() => {
        if (!open) {
            requestIdRef.current += 1;
            setSelectedAdviserId("");
            setError("");
            setAddAdviserOpen(false);
            return;
        }

        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        const loadAdvisers = async () => {
            setLoadingAdvisers(true);
            setError("");
            try {
                const response = await listAdvisers();
                if (requestId !== requestIdRef.current) return;
                setAdvisers(response);
            } catch (loadError) {
                if (requestId !== requestIdRef.current) return;
                setAdvisers([]);
                setError(parseApiError(loadError, "No se pudieron cargar los asesores."));
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoadingAdvisers(false);
                }
            }
        };

        void loadAdvisers();
    }, [open]);

    useEffect(() => {
        if (!addAdviserOpen) {
            setSelectedUserId("");
            setAddError("");
            return;
        }

        let cancelled = false;

        const loadUsers = async () => {
            setLoadingUsers(true);
            setAddError("");
            try {
                const response = await listUsers({ status: "active", page: 1 });
                if (cancelled) return;
                setUsers(
                    response.items
                        .filter((user) => !adviserIds.has(user.id))
                        .map((user) => ({
                            value: user.id,
                            label: `${user.name} (${user.email})`,
                        })),
                );
            } catch (loadError) {
                if (cancelled) return;
                setUsers([]);
                setAddError(parseApiError(loadError, "No se pudieron cargar los usuarios."));
            } finally {
                if (!cancelled) setLoadingUsers(false);
            }
        };

        void loadUsers();

        return () => {
            cancelled = true;
        };
    }, [addAdviserOpen, adviserIds]);

    const adviserOptions = useMemo(
        () =>
            advisers.map((adviser) => ({
                value: adviser.id,
                label: adviser.name?.trim()
                    ? `${adviser.name} (${adviser.email})`
                    : adviser.email,
            })),
        [advisers],
    );

    const submitAssignment = () => {
        if (!selectedAdviserId || loading || loadingAdvisers) return;
        void onSubmit(selectedAdviserId);
    };

    const submitClearAssignment = () => {
        if (loading || loadingAdvisers) return;
        void onSubmit(null);
    };

    const createSelectedAdviser = () => {
        if (!selectedUserId || savingAdviser) return;

        setSavingAdviser(true);
        setAddError("");
        void createAdviser(selectedUserId)
            .then((adviser) => {
                setAdvisers((current) =>
                    current.some((item) => item.id === adviser.id)
                        ? current
                        : [...current, adviser],
                );
                setSelectedAdviserId(adviser.id);
                setAddAdviserOpen(false);
                setSelectedUserId("");
            })
            .catch((createError) => {
                setAddError(parseApiError(createError, "No se pudo añadir el asesor."));
            })
            .finally(() => setSavingAdviser(false));
    };

    return (
        <Modal
            open={open}
            title="Asignación masiva"
            description={`${selectedCount} pedido(s) seleccionado(s).`}
            onClose={() => {
                if (loading) return;
                onClose();
            }}
            className="w-full max-w-lg"
            closeButtonClassName="rounded-sm"
            bodyClassName="px-4 py-4"
        >
            <div className="space-y-4">
                {error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <FloatingSelect
                        label="Asesor"
                        name="bulk-assigned-by"
                        value={selectedAdviserId}
                        options={adviserOptions}
                        onChange={setSelectedAdviserId}
                        placeholder={loadingAdvisers ? "Cargando asesores..." : "Selecciona asesor"}
                        disabled={loading || loadingAdvisers || adviserOptions.length === 0}
                        searchable
                        panelWidthMode="min-trigger"
                        emptyMessage="Sin asesores"
                    />

                    {canAssignRoles ? (
                        <SystemButton
                            type="button"
                            size="icon"
                            className="h-9 w-9 rounded-md"
                            title="Añadir asesor"
                            aria-label="Añadir asesor"
                            onClick={() => setAddAdviserOpen(true)}
                            disabled={loading || loadingAdvisers}
                        >
                            <Plus className="h-4 w-4" />
                        </SystemButton>
                    ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <SystemButton
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </SystemButton>

                    <SystemButton
                        variant="danger"
                        size="sm"
                        className="rounded-md"
                        leftIcon={<UserX className="h-4 w-4" />}
                        onClick={submitClearAssignment}
                        disabled={loading || loadingAdvisers}
                        loading={loading && !selectedAdviserId}
                    >
                        Quitar asesor
                    </SystemButton>

                    <SystemButton
                        size="sm"
                        className="rounded-md"
                        leftIcon={<UserCheck className="h-4 w-4" />}
                        onClick={submitAssignment}
                        disabled={!selectedAdviserId || loading || loadingAdvisers}
                        loading={loading && Boolean(selectedAdviserId)}
                    >
                        Asignar
                    </SystemButton>
                </div>
            </div>

            <Modal
                open={addAdviserOpen}
                onClose={() => {
                    if (savingAdviser) return;
                    setAddAdviserOpen(false);
                }}
                title="Añadir usuario a lista de asesores"
                className="w-[440px]"
                closeButtonClassName="rounded-sm"
                bodyClassName="px-4 py-4"
            >
                <div className="space-y-4">
                    {addError ? (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{addError}</span>
                        </div>
                    ) : null}

                    <FloatingSelect
                        label="Usuario"
                        name="bulk-new-adviser-user"
                        value={selectedUserId}
                        options={users}
                        onChange={setSelectedUserId}
                        placeholder={loadingUsers ? "Cargando usuarios..." : "Selecciona usuario"}
                        disabled={loadingUsers || savingAdviser}
                        searchable
                        panelWidthMode="min-trigger"
                        emptyMessage="Sin usuarios disponibles"
                    />

                    <div className="flex justify-end gap-2">
                        <SystemButton
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                            onClick={() => setAddAdviserOpen(false)}
                            disabled={savingAdviser}
                        >
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="sm"
                            className="rounded-md"
                            leftIcon={<Plus className="h-4 w-4" />}
                            disabled={!selectedUserId || savingAdviser || loadingUsers}
                            loading={savingAdviser}
                            onClick={createSelectedAdviser}
                        >
                            Añadir
                        </SystemButton>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
}
