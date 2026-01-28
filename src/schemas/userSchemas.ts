import { z } from 'zod';

/**
 * Esquema de validación para la creeacion de un usuario.
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  roleId: z.string().optional(),
  avatarUrl: z.any().optional(),
});

/**
 * Esquema de validación para la modificacion de un usuario.
 */
export const updateUserSchema = createUserSchema.partial({
  password: true, // Solo se vuelve opcional el campo que quieras
});
