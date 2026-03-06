import { z } from 'zod';

/**
 * Esquema de validación para la creeacion de un usuario.
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  roleId: z.string().optional(),
  avatar: z.string().optional()
});

/**
 * Esquema de validación para la modificacion de un usuario.
 */
export const updateUserSchema = createUserSchema.partial({
  password: true, // Solo se vuelve opcional el campo que quieras
});


