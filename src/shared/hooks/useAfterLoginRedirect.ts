import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { successResponse } from "@/shared/common/utils/response";

export const useAfterLoginRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || loading) return;

    navigate(RoutesPaths.dashboard, {
      replace: true,
      state: { feedbackMessage: successResponse("Inicio de sesion exitoso") },
    });
  }, [isAuthenticated, loading, navigate]);
};


