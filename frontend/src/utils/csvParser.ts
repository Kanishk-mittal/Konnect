// CSV Parser utility

/**
 * Convert CSV file to array of JSON objects
 * @param file - CSV file to parse
 * @returns Promise with array of objects representing each row
 */
export const csvToJson = async (file: File): Promise<Record<string, string | null>[]> => {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.trim().split('\n');
        
        if (lines.length === 0) {
          resolve([]);
          return;
        }
        
        // Parse header row (first line) - these become the object keys
        const headers = lines[0]
          .split(',')
          .map(header => header.trim().replace(/"/g, ''));
        
        const result: Record<string, string | null>[] = [];
        
        // Parse data rows (skip header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') continue; // Skip completely empty lines
          
          const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
          
          // Create object for this row
          const rowObject: Record<string, string | null> = {};
          
          // Map each value to its corresponding header
          headers.forEach((header, index) => {
            // If there's no value or it's empty, use null
            const value = values[index];
            rowObject[header] = (value && value.trim() !== '') ? value : null;
          });
          
          result.push(rowObject);
        }
        
        resolve(result);
        
      } catch (error) {
        reject(new Error(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };
    
    reader.readAsText(file);
  });
};