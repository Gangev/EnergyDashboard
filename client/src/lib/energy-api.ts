import { apiRequest } from "./queryClient";
import { type SheetData } from "@shared/schema";

export async function fetchEnergyData(): Promise<SheetData> {
  console.log("🚀 Starting fetchEnergyData...");
  try {
    const response = await apiRequest("GET", "/api/energy-data");
    console.log("✅ API request successful, parsing JSON...");
    const data = await response.json();
    console.log("📊 Data received:", { fileDate: data.fileDate, dataLength: data.data?.length });
    console.log("🔍 Full data object:", data);
    return data;
  } catch (error) {
    console.error("❌ Error in fetchEnergyData:", error);
    throw error;
  }
}
