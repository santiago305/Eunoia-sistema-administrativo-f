export type Role = "admin" | "moderator" | "adviser";

export enum RoleType {
  ADMIN = "admin",
  MODERATOR = "moderator",
  ADVISER = "adviser",
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  moderator: "Moderador",
  adviser: "Asesor",
};
