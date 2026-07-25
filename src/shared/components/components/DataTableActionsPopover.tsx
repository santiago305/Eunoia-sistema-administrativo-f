import type { MouseEvent } from "react";
import { Menu } from "lucide-react";
import { ActionsPopover, type ActionItem } from "./ActionsPopover";

type DataTableActionsPopoverProps = {
  actions: ActionItem[];
  triggerLabel?: string;
};

/** Presentación única del menú de acciones usado en las tablas del sistema. */
export function DataTableActionsPopover({
  actions,
  triggerLabel = "Acciones",
}: DataTableActionsPopoverProps) {
  return (
    <ActionsPopover
      actions={actions}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-4 w-4" />}
      triggerLabel={triggerLabel}
      popoverClassName="min-w-35"
      popoverBodyClassName="p-2"
      renderAction={(action, helpers) => (
        <button
          key={action.id}
          type="button"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            helpers.onAction(action);
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
          disabled={action.disabled}
        >
          {action.icon}
          {action.label}
        </button>
      )}
    />
  );
}
