import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { errorResponse } from "@/shared/common/utils/response";
import { RoutesPaths } from "../config/routesPaths";
import { useCompany } from "@/shared/hooks/useCompany";

export default function CompanyRequiredRoute({
  children,
}: {
  children: ReactElement;
}) {
  const location = useLocation();
  const { checked, hasCompany, loading } = useCompany();

  if (loading || !checked) {
    return <div>Cargando empresa...</div>;
  }

  if (!hasCompany) {
    return (
      <Navigate
        to={RoutesPaths.company}
        replace
        state={{
          flashMessage: errorResponse(
            "Primero debes registrar la empresa para realizar esta operacion.",
          ),
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}
