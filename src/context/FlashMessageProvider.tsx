import { useState, ReactNode, useCallback } from "react";
import { FlashMessageType } from "@/components/flashMessage/FlashTypes";
import { FlashMessageContext } from "./FlashMessageContext";

/**
 * Proveedor del contexto de mensajes flash.
 * 
 * Este componente envuelve la aplicación y proporciona métodos 
 * para mostrar y limpiar mensajes flash.
 * 
 * @param {ReactNode} children Componentes hijos.
 * @returns {JSX.Element} Contexto aplicado a los hijos.
 */
export const FlashMessageProvider = ({ children }: { children: ReactNode }) => {
  const [flash, setFlash] = useState<FlashMessageType | null>(null);

  const showFlash = useCallback((msg: FlashMessageType) => setFlash(msg), []);
  const clearFlash = useCallback(() => setFlash(null), []);

  return (
    <FlashMessageContext.Provider value={{ flash, showFlash, clearFlash }}>
      {children}
    </FlashMessageContext.Provider>
  );
};


