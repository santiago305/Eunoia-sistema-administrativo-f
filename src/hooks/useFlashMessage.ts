import { FlashMessageContext } from "@/context/FlashMessageContext";
import { useContext } from "react";

/**
 * Hook personalizado para acceder al contexto de mensajes flash.
 * 
 * Permite mostrar y limpiar mensajes flash en cualquier componente.
 * 
 * @throws {Error} Si se usa fuera de un FlashMessageProvider.
 * @returns {FlashMessageContextProps} El contexto de mensajes flash.
 */
export const useFlashMessage = () => {
  const context = useContext(FlashMessageContext);
  if (!context) throw new Error("useFlashMessage must be used within FlashMessageProvider");
  return context;
};


