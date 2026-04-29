import { z } from "zod";
import { LoginSchema } from "@/shared/schemas/authSchemas";
import { ChangePasswordSchema } from "@/shared/schemas/authSchemas";

export type LoginCredentials = z.infer<typeof LoginSchema>;
export type ChangePasswordType = z.infer<typeof ChangePasswordSchema>;


