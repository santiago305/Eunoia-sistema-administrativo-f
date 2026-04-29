import { statusMessage } from "./statusMesage";


export interface SuccessResponse {
  type: statusMessage.SUCCESS;
  message: string;
}

export interface ErrorResponse {
  type: statusMessage.ERROR;
  message: string;
}

export interface WarningResponse {
  type: statusMessage.WARNING;
  message: string;
}

export interface InfoResponse {
  type: statusMessage.INFO;
  message: string;
}
export interface InvalidResponse {
  type: statusMessage.INVALID;
  message: string;
}


