import type { Express } from "express";
import { createServer, type Server } from "http";
import { sheetDataSchema } from "@shared/schema";

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBi2FZwSCEfR_5v8LArpuIzcAo3jOmHPBYFEdJ6RXUv2kVNrbQ8YlLaR86M4XkjshaV-7IzZsChh2E/pub?output=csv";

function parseCSVData(csvText: string) {
  const lines = csvText.trim().split('\n');
  
  // Extract file date from cell E5 (row 5, column E which is index 4)
  let fileDate = new Date().toLocaleDateString('it-IT');
  
  // Try to find the date in cell E5 (row 5, column E)
  if (lines.length >= 5) {
    const row5 = lines[4]; // 5th row (0-indexed)
    const columns = parseCSVLine(row5);
    if (columns.length >= 5 && columns[4]) {
      const e5Value = columns[4].replace(/["\s]/g, ''); // Remove quotes and spaces
      // Check if it looks like a date (dd/mm/yyyy or similar formats)
      if (e5Value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        fileDate = e5Value;
        console.log('Using E5 date:', fileDate);
      }
    }
  }
  
  // Fallback: try to find the date in "Data Oggi" column (column D, index 3) from second row
  if (fileDate === new Date().toLocaleDateString('it-IT') && lines.length >= 2) {
    const dataRow = lines[1]; // Second row (first data row)
    const columns = parseCSVLine(dataRow);
    if (columns.length >= 4 && columns[3]) {
      const dataOggiValue = columns[3].replace(/["\s]/g, ''); // Remove quotes and spaces
      // Check if it looks like a date (dd/mm/yyyy or similar formats)
      if (dataOggiValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        fileDate = dataOggiValue;
        console.log('Using Data Oggi date as fallback:', fileDate);
      }
    }
  }
  
  const data = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line with proper handling of quoted values
    const columns = parseCSVLine(line);
    
    if (columns.length >= 3) {
      const dateStr = columns[0];
      const gasStr = columns[1];
      const powerStr = columns[2];
      
      // Skip if date column doesn't look like a date
      if (!dateStr || !dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        continue;
      }
      
      // Parse Italian numbers (replace comma with dot for decimal separator)
      const gas = parseItalianNumber(gasStr);
      const power = parseItalianNumber(powerStr);
      
      // Only include valid rows with numeric data
      if (!isNaN(gas) && !isNaN(power)) {
        data.push({
          date: dateStr,
          gas: gas,
          power: power
        });
      }
    }
  }
  
  return { 
    fileDate,
    data
  };
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseItalianNumber(str: string): number {
  if (!str) return 0;
  
  // Remove quotes and trim
  const cleaned = str.replace(/["\s]/g, '');
  
  if (!cleaned) return 0;
  
  // Convert Italian decimal format (comma) to English format (dot)
  const normalized = cleaned.replace(',', '.');
  
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.get("/api/energy-data", async (req, res) => {
    try {
      // Fetch data from Google Sheets
      const response = await fetch(GOOGLE_SHEETS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheets data: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const parsedData = parseCSVData(csvText);
      const validatedData = sheetDataSchema.parse(parsedData);
      res.json(validatedData);
    } catch (error) {
      console.error('Error fetching energy data:', error);
      res.status(500).json({ 
        message: 'Failed to fetch energy data from Google Sheets',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
