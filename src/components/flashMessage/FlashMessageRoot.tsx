import { useFlashMessage } from "@/hooks/useFlashMessage";
import { FlashMessage } from "./flashMessage";

/**
 * Componente raíz para renderizar el mensaje flash.
 * 
 * Se debe colocar cerca del root de la app para permitir 
 * la visualización global de los mensajes.
 * 
 * @returns {JSX.Element | null} El componente de mensaje o null.
 */
export const FlashMessageRoot = () => {
  const { flash, clearFlash } = useFlashMessage();

  return flash ? <FlashMessage data={flash} onClear={clearFlash} /> : null;
};


