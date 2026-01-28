import { z } from 'zod';
import { createRole, updateRole } from '../schemas/roleSchemas'; // adjust the import path as needed

export type CreateRole = z.infer<typeof createRole>;
export type UpdateRole = z.infer<typeof updateRole>;