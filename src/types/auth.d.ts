import { z } from "zod";
import { LoginSchema } from "@/schemas/authSchemas";
import { ChangePasswordSchema } from "@/schemas/authSchemas";

export type LoginCredentials = z.infer<typeof LoginSchema>;
export type ChangePasswordType = z.infer<typeof ChangePasswordSchema>;
