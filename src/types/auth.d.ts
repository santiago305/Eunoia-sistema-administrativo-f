import { z } from "zod";
import { LoginSchema } from "@/schemas/authSchemas";

export type LoginCredentials = z.infer<typeof LoginSchema>;
