import { Plus, Zap } from "lucide-react";
import type { WorkflowDraft } from "@/features/workflows/types/workflow";
import { TRANSITION_EFFECTS } from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  draft: WorkflowDraft;
  selectedId: string | null;
  disabled?: boolean;
  onAddRunAction: () => void;
  onSelect: (clientId: string) => void;
};

export function WorkflowGlobalTransitions({
  draft,
  selectedId,
  disabled,
  onAddRunAction,
  onSelect,
}: Props) {
  const globalActions = draft.transitions.filter(
    (transition) =>
      transition.isGlobal &&
      (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
        TRANSITION_EFFECTS.RUN_ACTIONS,
  );

  return (
    <section className="mt-5 border-t border-black/10 pt-4">
  
      <SystemButton
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
        onClick={onAddRunAction}
        className="mb-2 w-full"
      >
        Agregar acción global
      </SystemButton>

      <div className="space-y-1">
        {globalActions.map((transition) => (
          <button
            key={transition.clientId}
            type="button"
            className={`block w-full rounded-md border px-2 py-2 text-left text-xs ${
              selectedId === transition.clientId
                ? "border-primary/40 bg-primary/5"
                : "border-transparent hover:bg-black/[0.04]"
            }`}
            onClick={() => onSelect(transition.clientId)}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {transition.name || "Acción global"}
                </div>
              </div>
            </div>
          </button>
        ))}

        {!globalActions.length ? (
          <div className="rounded-md bg-black/[0.025] px-2 py-3 text-[10px] text-black/45">
            Sin acciones globales.
          </div>
        ) : null}
      </div>
    </section>
  );
}