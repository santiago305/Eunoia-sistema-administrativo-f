import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { infoResponse, successResponse } from "@/common/utils/response";

export const useAfterLoginRedirect = () => {
  const { isAuthenticated, userRole, hasClient, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || loading) return;
    console.log("[useAfterLoginRedirect] isAuthenticated:", isAuthenticated, "userRole:", userRole, "hasClient:", hasClient);
    const msg = successResponse("Inicio de sesión exitoso");
    console.log("Mensaje a enviar:", msg);
    if (userRole === "user") {
      if (hasClient === false) {
        navigate(RoutesPaths.clientsRegister, { replace: true, state: { flashMessage: infoResponse("Completa tu registro de cliente.") } });
      } else {
        navigate(RoutesPaths.dashboard, { replace: true, state: { flashMessage: successResponse("Inicio de sesión exitoso") } });
      }
    } else {
      navigate(RoutesPaths.dashboard, { replace: true, state: { flashMessage: successResponse("Inicio de sesión exitoso") } });
    }
  }, [isAuthenticated, userRole, hasClient, loading, navigate]);
};
