import { z } from "zod";

export const energyDataSchema = z.object({
  date: z.string(),
  gas: z.number(),
  power: z.number(),
});

export const sheetDataSchema = z.object({
  fileDate: z.string(),
  data: z.array(energyDataSchema),
});

export const filterSchema = z.object({
  period: z.array(z.enum(["consolidato", "forecast"])).min(1),
  type: z.enum(["gas", "power"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type EnergyData = z.infer<typeof energyDataSchema>;
export type SheetData = z.infer<typeof sheetDataSchema>;
export type FilterOptions = z.infer<typeof filterSchema>;
