import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FlashMessageType } from "@/shared/components/components/flashMessage/FlashTypes";
import { useFlashMessage } from "./useFlashMessage";

export function useLocationFlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showFlash } = useFlashMessage();
  const hasShownFlash = useRef(false);

  useEffect(() => {
    const state = location.state as { flashMessage?: FlashMessageType } | undefined;

    if (state?.flashMessage && !hasShownFlash.current) {
      showFlash(state.flashMessage);
      hasShownFlash.current = true;
      // Limpia el state para que no muestre otra vez el mensaje
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      hasShownFlash.current = false;
    }
  }, [location, navigate, showFlash]);
}


