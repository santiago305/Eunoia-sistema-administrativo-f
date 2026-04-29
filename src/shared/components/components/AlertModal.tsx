import { useMemo, type ReactNode } from "react";
import {
  AlertTriangle,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "@/shared/lib/utils";
import { Modal } from "../modales/Modal";

export type AlertModalType = "deleted" | "restore" | "warning" | "info";

type AlertModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;

  type?: AlertModalType;
  title?: string;
  message?: ReactNode;

  confirmText?: string;
  cancelText?: string;

  hideCancel?: boolean;
  hideConfirm?: boolean;
  loading?: boolean;

  icon?: ReactNode;

  className?: string;
  alertClassName?: string;
  footerClassName?: string;
};

type AlertConfig = {
  title: string;
  confirmText: string;
  icon: ReactNode;
  containerClassName: string;
  confirmVariant: "primary" | "success" | "warning" | "danger" | "outline" | "ghost" | "secondary" | "link";
};

function getAlertConfig(type: AlertModalType): AlertConfig {
  switch (type) {
    case "deleted":
      return {
        title: "Confirmar acción",
        confirmText: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        containerClassName: "border-rose-200 bg-rose-50 text-rose-800",
        confirmVariant: "danger",
      };

    case "restore":
      return {
        title: "Confirmar restauración",
        confirmText: "Restaurar",
        icon: <RotateCcw className="h-4 w-4" />,
        containerClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
        confirmVariant: "success",
      };

    case "info":
      return {
        title: "Información",
        confirmText: "Aceptar",
        icon: <Info className="h-4 w-4" />,
        containerClassName: "border-sky-200 bg-sky-50 text-sky-800",
        confirmVariant: "primary",
      };

    case "warning":
    default:
      return {
        title: "Atención",
        confirmText: "Confirmar",
        icon: <AlertTriangle className="h-4 w-4" />,
        containerClassName: "border-amber-200 bg-amber-50 text-amber-800",
        confirmVariant: "warning",
      };
  }
}

export function AlertModal({
  open,
  onClose,
  onConfirm,
  type = "warning",
  title,
  message,
  confirmText,
  cancelText = "Cancelar",
  hideCancel = false,
  hideConfirm = false,
  loading = false,
  icon,
  className,
  alertClassName,
  footerClassName,
}: AlertModalProps) {
  const config = useMemo(() => getAlertConfig(type), [type]);

  const resolvedTitle = title ?? config.title;
  const resolvedConfirmText = confirmText ?? config.confirmText;
  const resolvedIcon = icon ?? config.icon;

  return (
    <Modal
      open={open}
      title={resolvedTitle}
      onClose={onClose}
      className={cn("max-w-md", className)}
    >
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3 text-sm",
          config.containerClassName,
          alertClassName,
        )}
      >
        <div className="mt-0.5 shrink-0">{resolvedIcon}</div>

        <div className="leading-5">
          {message ?? (
            <>
              <span className="font-semibold">Ojo:</span> estás por realizar una acción.
              Hazlo solo si estás seguro.
            </>
          )}
        </div>
      </div>

      <div className={cn("mt-4 flex justify-end gap-2", footerClassName)}>
        {!hideCancel && (
          <SystemButton
            variant="outline"
            size="sm"
            className="text-[11px]"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </SystemButton>
        )}

        {!hideConfirm && (
          <SystemButton
            variant={config.confirmVariant}
            size="sm"
            className="text-[11px]"
            onClick={onConfirm}
            loading={loading}
          >
            {resolvedConfirmText}
          </SystemButton>
        )}
      </div>
    </Modal>
  );
}

/**
 * ========================= ALERT MODAL =========================
 *
 * Componente reutilizable para mostrar confirmaciones, advertencias
 * o mensajes informativos dentro de un Modal.
 *
 * ------------------------ PROPS ------------------------
 *
 * open: boolean
 * - Controla la visibilidad del modal.
 *
 * onClose: () => void
 * - Función que se ejecuta al cerrar el modal.
 *
 * onConfirm?: () => void
 * - Acción principal (ej: eliminar, restaurar, continuar).
 *
 * ------------------------ CONFIG VISUAL ------------------------
 *
 * type?: "deleted" | "restore" | "warning" | "info"
 * - Define automáticamente:
 *   - Colores del alert
 *   - Icono
 *   - Texto del botón
 *   - Variante del botón (danger, success, warning, etc)
 *
 * title?: string
 * - Sobrescribe el título por defecto del modal.
 *
 * message?: ReactNode
 * - Contenido del mensaje. Acepta JSX.
 *
 * icon?: ReactNode
 * - Permite reemplazar el icono por defecto.
 *
 * ------------------------ BOTONES ------------------------
 *
 * confirmText?: string
 * - Texto del botón de confirmación.
 *
 * cancelText?: string
 * - Texto del botón cancelar (default: "Cancelar").
 *
 * hideCancel?: boolean
 * - Oculta el botón cancelar (útil para modales informativos).
 *
 * hideConfirm?: boolean
 * - Oculta el botón confirmar.
 *
 * loading?: boolean
 * - Activa estado de carga en el botón confirmar.
 *
 * ------------------------ ESTILOS ------------------------
 *
 * className?: string
 * - Clases para el contenedor del modal.
 *
 * alertClassName?: string
 * - Clases para la caja del mensaje.
 *
 * footerClassName?: string
 * - Clases para el contenedor de botones.
 *
 * ------------------------ EJEMPLOS ------------------------
 *
 * // Eliminación
 * <AlertModal
 *   open={open}
 *   type="deleted"
 *   onClose={close}
 *   onConfirm={handleDelete}
 *   message="Estás por eliminar este registro."
 * />
 *
 * // Restaurar
 * <AlertModal
 *   open={open}
 *   type="restore"
 *   onConfirm={handleRestore}
 * />
 *
 * // Informativo
 * <AlertModal
 *   open={open}
 *   type="info"
 *   hideCancel
 *   onConfirm={close}
 *   message="Operación exitosa"
 * />
 *
 * ============================================================
 */