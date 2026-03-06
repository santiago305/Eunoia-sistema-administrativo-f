import { z } from "zod";
import { createUserSchema, updateUserSchema } from "@/schemas/userSchemas";
import type { Role } from "./roles.types";

export type CreateUserDto = z.infer<typeof createUserSchema>;
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

export type { Role };
