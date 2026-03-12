import { z } from "zod";

export const securityTopIpsQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  limit: z.number().int().min(1).max(200).optional().default(20),
  reason: z.string().trim().min(1).max(120).optional(),
});

export const securityHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
});

export const securitySeriesQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  groupBy: z.enum(["5min", "15min", "30min", "hour", "day"]).optional(),
  reason: z.string().trim().min(1).max(120).optional(),
});

export const securityHoursQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
});

export const securityTopRoutesQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  limit: z.number().int().min(1).max(200).optional().default(5),
  reason: z.string().trim().min(1).max(120).optional(),
});

export const securityHoursAndReasonQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  reason: z.string().trim().min(1).max(120).optional(),
});

export const securityReasonsQuerySchema = z.object({
  hours: z.number().int().min(1).max(720).optional().default(24),
  activeOnly: z.boolean().optional().default(true),
});

export const securityBlacklistSchema = z.object({
  ip: z
    .string()
    .trim()
    .ip({ version: "v4", message: "IP v4 invalida" })
    .or(z.string().trim().ip({ version: "v6", message: "IP v6 invalida" })),
  notes: z.string().trim().max(500).optional(),
});
