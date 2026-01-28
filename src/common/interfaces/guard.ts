import { statusMessage } from "./statusMesage";


export type ErrorResponse =
  | { type: statusMessage.ERROR; message: string }
  | { type: statusMessage.INVALID; message: string }
  | { type: statusMessage.UNAUTHORIZED; message: string }
  | { type: statusMessage.WARNING; message: string };

export function isTypeResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'type' in response &&
    Object.values(statusMessage).includes(
      (response as { type?: unknown }).type as statusMessage
    )
  );
}
