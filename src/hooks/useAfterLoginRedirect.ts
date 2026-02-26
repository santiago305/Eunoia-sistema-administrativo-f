import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { infoResponse, successResponse } from "@/common/utils/response";

export const useAfterLoginRedirect = () => {
  const { isAuthenticated, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || loading) return;

    if (userRole) {
      navigate(RoutesPaths.dashboard, {
        replace: true,
        state: { flashMessage: successResponse("Inicio de sesion exitoso") },
      });
    } else {
      navigate(RoutesPaths.login, {
        replace: true,
        state: { flashMessage: infoResponse("No se pudo obtener el rol del usuario.") },
      });
    }
  }, [isAuthenticated, userRole, loading, navigate]);
};
