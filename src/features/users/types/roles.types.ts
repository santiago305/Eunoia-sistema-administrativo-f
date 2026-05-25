export type Role = "admin" | "moderator" | "adviser" | "purchasing_manager";

export enum RoleType {
  ADMIN = "admin",
  MODERATOR = "moderator",
  ADVISER = "adviser",
  PURCHASING_MANAGER = "purchasing_manager",
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  moderator: "Moderador",
  adviser: "Asesor",
  purchasing_manager: "Jefe de compras",
};
