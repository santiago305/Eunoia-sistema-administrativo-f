import { useMemo } from "react";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { permissions } = useAuth();
  const safePermissions = Array.isArray(permissions) ? permissions : [];

  return useMemo(
    () => ({
      permissions,
      can: (permission: string) => safePermissions.includes(permission),
      canAny: (required: string[]) => required.some((permission) => safePermissions.includes(permission)),
      canAll: (required: string[]) => required.every((permission) => safePermissions.includes(permission)),
    }),
    [permissions, safePermissions]
  );
};

