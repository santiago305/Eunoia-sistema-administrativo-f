type StateNameRef = {
  clientId: string;
  name: string;
};

const HANDLE_PREFIX = /^(source|target)-/;

export function normalizeWorkflowHandleId(handleId?: string | null) {
  return handleId ? handleId.replace(HANDLE_PREFIX, "") : null;
}

export function getDestinationStateName(
  states: StateNameRef[],
  destinationClientId: string,
) {
  return (
    states.find((state) => state.clientId === destinationClientId)?.name.trim() ||
    undefined
  );
}
