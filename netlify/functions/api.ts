import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBi2FZwSCEfR_5v8LArpuIzcAo3jOmHPBYFEdJ6RXUv2kVNrbQ8YlLaR86M4XkjshaV-7IzZsChh2E/pub?output=csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
  return result.map(field => field.replace(/^"|"$/g, ''));
}

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

  const data = [];

  // Start from row 7 (index 6) for data
  for (let i = 6; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const columns = parseCSVLine(line);

    // Skip if not enough columns or if first column is empty
    if (columns.length < 4 || !columns[0].trim()) continue;

    const dateStr = columns[0];
    const productionStr = columns[1];
    const consumptionStr = columns[2];
    const gridStr = columns[3];

    // Parse numbers, handle different decimal separators
    const parseNumber = (str: string): number => {
      if (!str || str.trim() === '') return 0;
      // Replace comma with dot for decimal separator and remove any spaces
      const cleaned = str.replace(/,/g, '.').replace(/\s/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    data.push({
      date: dateStr.trim(),
      gas: parseNumber(consumptionStr), // consumption maps to gas
      power: parseNumber(productionStr), // production maps to power
    });
  }

  return {
    fileDate,
    data
  };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { path, httpMethod } = event;

  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Handle energy-data endpoint
  if (path.includes('energy-data') && httpMethod === 'GET') {
    try {
      console.log('Fetching data from:', GOOGLE_SHEETS_URL);
      const response = await fetch(GOOGLE_SHEETS_URL);
      console.log('Response status:', response.status);

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log('CSV text length:', csvText.length);
      console.log('CSV preview:', csvText.substring(0, 200));

      const parsedData = parseCSVData(csvText);
      console.log('Parsed data:', { fileDate: parsedData.fileDate, dataCount: parsedData.data.length });

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      };
    } catch (error) {
      console.error('Error fetching energy data:', error);
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to fetch energy data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' }),
  };
};