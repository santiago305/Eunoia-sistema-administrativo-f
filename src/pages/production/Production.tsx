import { Navigate } from "react-router-dom";
import { RoutesPaths } from "@/router/config/routesPaths";

export default function ProductionRedirect() {
  return <Navigate to={RoutesPaths.production} replace />;
}
