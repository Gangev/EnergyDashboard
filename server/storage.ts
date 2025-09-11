import { type EnergyData, type SheetData } from "@shared/schema";

export interface IStorage {
  // No persistent storage needed for this app
}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();
