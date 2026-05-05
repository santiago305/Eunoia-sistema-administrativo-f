import { useMemo } from "react";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { permissions } = useAuth();

  return useMemo(
    () => ({
      permissions,
      can: (permission: string) => permissions.includes(permission),
      canAny: (required: string[]) => required.some((permission) => permissions.includes(permission)),
      canAll: (required: string[]) => required.every((permission) => permissions.includes(permission)),
    }),
    [permissions]
  );
};

