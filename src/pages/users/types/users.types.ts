import { z } from "zod";
import { createUserSchema, updateUserSchema } from "@/schemas/userSchemas";
import type { Role } from "./roles.types";

// Roles y estados válidos para endpoints de usuarios.
export type RoleType = Role;
export type UserListStatus = "all" | "active" | "inactive";
export type RoleListStatus = UserListStatus;

// Request: POST /users/create
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  roleId?: string;
  avatarUrl?: string;
  telefono?: string;
}

// Respuesta estándar backend.
export interface ApiSuccess<T = unknown> {
  type: "success";
  message: string;
  data?: T;
}

// Create user devuelve mensaje (sin data útil para UI hoy).
export type CreateUserResponse = ApiSuccess;

// DTO de usuario para listados/perfil.
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  telefono?: string;
  avatarUrl?: string;
  deleted?: boolean;
  role?: string;
  rol?: string;
  roleId?: string;
  createdAt?: string | Date;
}

// PATCH /users/me/update (hoy no usado en este form de creación).
export interface UpdateMyUserRequest {
  name?: string;
  telefono?: string;
}

// PATCH /users/me/change-password (hoy no usado en este form de creación).
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Conteo por rol para dashboard/listado.
export interface CountUsersByRoleData {
  total: number;
  byRole: Partial<Record<RoleType, number>>;
}

// Compatibilidad con tipos inferidos existentes.
export type CreateUserDto = z.infer<typeof createUserSchema> & CreateUserRequest;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
};

export type RoleOption = {
  id: string;
  description: Role;
};

export interface UserRoleOptionApi {
  id: string;
  description: RoleType | string;
}

export interface RoleItem {
  id: string;
  description: RoleType | string;
  deleted: boolean;
  createdAt: string;
}

export type { Role };
