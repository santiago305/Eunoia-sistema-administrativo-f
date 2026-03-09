import { z } from "zod";

export const securityTopIpsQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  limit: z.number().int().min(1).max(200).optional().default(20),
});

export const securityHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
});

export const securitySeriesQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  groupBy: z.enum(["hour", "day"]).optional().default("hour"),
});

export const securityHoursQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
});

export const securityTopRoutesQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  limit: z.number().int().min(1).max(200).optional().default(5),
});

export const securityBlacklistSchema = z.object({
  ip: z
    .string()
    .trim()
    .ip({ version: "v4", message: "IP v4 invalida" })
    .or(z.string().trim().ip({ version: "v6", message: "IP v6 invalida" })),
  notes: z.string().trim().max(500).optional(),
});
