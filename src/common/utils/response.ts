
import {
  SuccessResponse,
  ErrorResponse,
  WarningResponse,
  InfoResponse,
  InvalidResponse,
} from "../interfaces/response.interface";
import { statusMessage } from "../interfaces/statusMesage";

export const successResponse = (message: string): SuccessResponse => ({
  type: statusMessage.SUCCESS, // debería ser 'success'
  message,
});

export const errorResponse = (message: string): ErrorResponse => ({
  type: statusMessage.ERROR, 
  message,
});

export const warningResponse = (message: string): WarningResponse => ({
  type: statusMessage.WARNING,
  message,
});

export const infoResponse = (message: string): InfoResponse => ({
  type: statusMessage.INFO,
  message,
});

export const invalidResponse = (message: string): InvalidResponse => ({
  type: statusMessage.INVALID,
  message,
});


