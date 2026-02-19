import {z} from "zod";

export const listUnits = z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string()
});
