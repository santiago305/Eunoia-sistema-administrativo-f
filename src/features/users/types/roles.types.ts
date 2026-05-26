export type Role = string;

export enum RoleType {
  ADMIN = "admin",
  MODERATOR = "moderator",
  ADVISER = "adviser",
  PURCHASING_MANAGER = "purchasing_manager",
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  moderator: "Moderador",
  adviser: "Asesor",
  purchasing_manager: "Jefe de compras",
};
