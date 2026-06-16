import type {
  ActionCatalogItem,
  ConditionCatalogItem,
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import {
  getAutoTriggerPatch,
  hasAutomaticTransitionSibling,
} from "@/features/workflows/utils/workflowDraft";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import { WorkflowActionEditor } from "./WorkflowActionEditor";

type Props = {
  draft: WorkflowDraft;
  selectedId: string | null;
  conditionCatalog: ConditionCatalogItem[];
  actionCatalog: ActionCatalogItem[];
  onStateChange: (state: WorkflowDraftState) => void;
  onTransitionChange: (transition: WorkflowDraftTransition) => void;
  onRemoveState: (clientId: string) => void;
  onRemoveTransition: (clientId: string) => void;
};

export function WorkflowPropertiesPanel(props: Props) {
  const state = props.draft.states.find(
    (item) => item.clientId === props.selectedId,
  );

  const transition = props.draft.transitions.find(
    (item) => item.clientId === props.selectedId,
  );

  if (!state && !transition) {
    return (
      <div className="p-4 text-xs text-black/50">
        Selecciona un estado o una transición para editarlo.
      </div>
    );
  }

  if (state) {
    const patch = (next: Partial<WorkflowDraftState>) =>
      props.onStateChange({ ...state, ...next });

    if (state.isSystem) {
      return (
        <div className="space-y-3 p-4">
          <div className="text-sm font-semibold">Estado interno</div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            Este estado es interno del sistema y no se edita desde el panel.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-4">
        <div className="text-sm font-semibold">Propiedades del estado</div>

        <div className="space-y-2 rounded-lg border border-black/10 bg-white p-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: state.color ?? "#64748b" }}
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-black/80">
                {state.name || "Estado sin nombre"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-black/10 bg-white p-3">
          <CheckboxRow
            label="Estado inicial"
            checked={state.isInitial}
            onCheckedChange={(checked) => patch({ isInitial: checked })}
          />

          <CheckboxRow
            label="Estado final"
            checked={state.isFinal}
            onCheckedChange={(checked) => patch({ isFinal: checked })}
          />
        </div>

        <SystemButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => props.onRemoveState(state.clientId)}
        >
          Eliminar del elemento
        </SystemButton>
      </div>
    );
  }

  const patch = (next: Partial<WorkflowDraftTransition>) =>
    props.onTransitionChange({ ...transition!, ...next });

  const stateOptions = props.draft.states
    .filter((item) => item.isSystem !== true)
    .map((item) => ({
      value: item.clientId,
      label: item.name,
    }));

  const transitionEffect = transition!.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
  const isGlobalTransition = transition!.isGlobal;
  const isNormalTransition = !transition!.isGlobal;
  const isSystemCancelTransition =
    transition!.isSystem === true &&
    transition!.purpose === TRANSITION_PURPOSES.CANCEL;
  const supportsAutomation =
    isNormalTransition &&
    transition!.purpose !== TRANSITION_PURPOSES.CANCEL;
  const elseEffect = transition!.elseEffect;
  const automationBlocked =
    !transition!.autoTrigger &&
    hasAutomaticTransitionSibling(props.draft.transitions, transition!);

  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="text-sm font-semibold">Propiedades de la transición</div>

        <div className="mt-1 flex flex-wrap gap-1">
          {isNormalTransition ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              Transición normal
            </span>
          ) : null}

          {isGlobalTransition ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              Global
            </span>
          ) : null}
        </div>
      </div>

      <FloatingInput
        label="Nombre"
        name="transition-name"
        value={transition!.name}
        onChange={(event) => patch({ name: event.target.value })}
        className="h-9 text-xs"
      />

      {isSystemCancelTransition ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">
          Esta transición se crea por defecto para cancelar pedidos.
        </div>
      ) : null}

      {supportsAutomation ? (
        <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
          <CheckboxRow
            label="Disparar automaticamente"
            checked={transition!.autoTrigger}
            disabled={automationBlocked}
            onCheckedChange={(checked) => patch(getAutoTriggerPatch(checked))}
          />
          {automationBlocked ? (
            <p className="text-[11px] text-sky-700">
              Este estado ya tiene una transicion automatica.
            </p>
          ) : null}
        </div>
      ) : null}

      {isGlobalTransition &&
      !isSystemCancelTransition &&
      transitionEffect === TRANSITION_EFFECTS.MOVE_STATE ? (
        <FloatingSelect
          label="Estado destino"
          name="transition-to-state"
          value={transition!.toStateClientId ?? ""}
          options={stateOptions}
          onChange={(value) =>
            patch({
              toStateClientId: value,
              isGlobal: true,
              purpose: TRANSITION_PURPOSES.STANDARD,
            })
          }
          searchable
        />
      ) : null}

      {isGlobalTransition ? (
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <div className="mb-2 text-[11px] font-medium text-black/55">
            Estados excluidos
          </div>

          <div className="space-y-2">
            {props.draft.states
              .filter((item) => item.isSystem !== true)
              .map((item) => (
                <CheckboxRow
                  key={item.clientId}
                  label={item.name}
                  checked={transition!.excludedStateClientIds.includes(
                    item.clientId,
                  )}
                  onCheckedChange={(checked) =>
                    patch({
                      excludedStateClientIds: checked
                        ? [...transition!.excludedStateClientIds, item.clientId]
                        : transition!.excludedStateClientIds.filter(
                            (stateId) => stateId !== item.clientId,
                          ),
                    })
                  }
                />
              ))}
          </div>
        </div>
      ) : null}

      {supportsAutomation && transition!.autoTrigger ? (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
          <div className="text-xs font-bold text-emerald-700">SI</div>
          <WorkflowConditionEditor
            catalog={props.conditionCatalog}
            value={transition!.conditions}
            onChange={(conditions) => patch({ conditions })}
          />
          {/* <BranchEffectFields
            prefix="then"
            effect={transitionEffect}
            destination={transition!.toStateClientId}
            stateOptions={stateOptions}
            onChange={(effect, destination) =>
              patch({
                effect,
                toStateClientId:
                  effect === TRANSITION_EFFECTS.MOVE_STATE ? destination : null,
              })
            }
          /> */}
          <WorkflowActionEditor
            catalog={props.actionCatalog}
            value={transition!.actions}
            onChange={(actions) => patch({ actions })}
          />
        </div>
      ) : (
        <>
          <WorkflowConditionEditor
            catalog={props.conditionCatalog}
            value={transition!.conditions}
            onChange={(conditions) => patch({ conditions })}
          />
          <WorkflowActionEditor
            catalog={props.actionCatalog}
            value={transition!.actions}
            onChange={(actions) => patch({ actions })}
          />
        </>
      )}

      {supportsAutomation && transition!.autoTrigger && !elseEffect ? (
        <SystemButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            patch({
              elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
              elseToStateClientId: null,
              elseActions: [],
            })
          }
        >
          Agregar rama SI NO
        </SystemButton>
      ) : null}

      {supportsAutomation && transition!.autoTrigger && elseEffect ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/30 p-3">
          <div className="text-xs font-bold text-amber-700">SI NO</div>
          {/* <BranchEffectFields
            prefix="else"
            effect={elseEffect}
            destination={transition!.elseToStateClientId}
            stateOptions={stateOptions}
            hideDestination
            onChange={(effect, destination) =>
              patch({
                elseEffect: effect,
                elseToStateClientId:
                  effect === TRANSITION_EFFECTS.MOVE_STATE ? destination : null,
              })
            }
          /> */}
          <WorkflowActionEditor
            catalog={props.actionCatalog}
            value={transition!.elseActions}
            onChange={(elseActions) => patch({ elseActions })}
          />
          <SystemButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                elseEffect: null,
                elseToStateClientId: null,
                elseActions: [],
              })
            }
          >
            Eliminar rama SI NO
          </SystemButton>
        </div>
      ) : null}

      <SystemButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => props.onRemoveTransition(transition!.clientId)}
      >
        Eliminar del elemento
      </SystemButton>
    </div>
  );
}

type CheckboxRowProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

function CheckboxRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: CheckboxRowProps) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span>{label}</span>
    </label>
  );
}
