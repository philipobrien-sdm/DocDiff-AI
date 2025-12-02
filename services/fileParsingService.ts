import { parseDocx } from './docxService';
// @ts-ignore
import Papa from 'papaparse';
// @ts-ignore
import * as XLSX from 'xlsx';

export const extractTextFromFile = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase();
  
  // DOCX Handling
  if (name.endsWith('.docx')) {
    const data = await parseDocx(file);
    return data.fullText;
  }
  
  // CSV Handling
  if (name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results: any) => {
          // Convert array of arrays to string
          const text = results.data
            .map((row: any) => Array.isArray(row) ? row.join(' ') : String(row))
            .join('\n');
          resolve(text);
        },
        error: (err: any) => reject(err)
      });
    });
  }

  // Excel Handling (XLSX / XLS)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          let fullText = "";
          
          workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            // Sheet to txt converts to tab-separated text
            const text = XLSX.utils.sheet_to_txt(worksheet);
            fullText += `--- Sheet: ${sheetName} ---\n${text}\n`;
          });
          
          resolve(fullText);
        } catch (error) {
          reject(new Error("Failed to parse Excel file: " + (error as any).message));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error(`Unsupported file type: ${file.name}. Please upload .docx, .csv, .xlsx, or .xls.`);
};
