import { z } from 'zod';

/**
 * Esquema de validaciÃ³n para la creeacion de un usuario.
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email invÃ¡lido'),
  password: z.string().min(8, 'La contraseÃ±a debe tener al menos 8 caracteres'),
  roleId: z.string().optional(),
  avatarUrl: z.string().optional(),
  telefono: z.string().optional(),
});

/**
 * Esquema de validaciÃ³n para la modificacion de un usuario.
 */
export const updateUserSchema = createUserSchema.partial({
  password: true, // Solo se vuelve opcional el campo que quieras
});



