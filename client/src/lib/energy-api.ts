import { apiRequest } from "./queryClient";
import { type SheetData } from "@shared/schema";

export async function fetchEnergyData(): Promise<SheetData> {
  const response = await apiRequest("GET", "/api/energy-data");
  return response.json();
}
