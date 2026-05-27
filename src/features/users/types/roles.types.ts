export type Role = string;

export enum RoleType {
  SUPER_ADMINISTRATOR = "super_administrator",
  ADMIN = "admin",
  MODERATOR = "moderator",
  ADVISER = "adviser",
  PURCHASING_MANAGER = "purchasing_manager",
}

export const ROLE_LABELS: Record<string, string> = {
  super_administrator: "Super administrador",
  admin: "Administrador",
  moderator: "Moderador",
  adviser: "Asesor",
  purchasing_manager: "Jefe de compras",
};
