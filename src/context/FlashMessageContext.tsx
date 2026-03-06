import { FlashMessageType } from "@/components/flashMessage/FlashTypes";
import { createContext } from "react";

/**
 * Propiedades del contexto de mensajes flash.
 */
interface FlashMessageContextProps {
  flash: FlashMessageType | null;
  showFlash: (msg: FlashMessageType) => void;
  clearFlash: () => void;
}

/**
 * Contexto para manejar la visualización de mensajes flash globales.
 */
export const FlashMessageContext = createContext<FlashMessageContextProps | undefined>(undefined);


