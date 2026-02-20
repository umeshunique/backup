/**
 * Parse CSV or Excel file for import.
 * CSV: papaparse. Excel: xlsx (SheetJS).
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedImportFile } from './importWizardTypes';

export type ImportFileType = 'csv' | 'excel';

const CSV_EXT = /\.csv$/i;
const EXCEL_EXT = /\.(xlsx|xls)$/i;

export function getFileType(fileName: string): ImportFileType | null {
  if (CSV_EXT.test(fileName)) return 'csv';
  if (EXCEL_EXT.test(fileName)) return 'excel';
  return null;
}

export function parseImportFile(file: File): Promise<ParsedImportFile> {
  const type = getFileType(file.name);
  if (!type) return Promise.reject(new Error('Unsupported file type. Use .csv, .xlsx, or .xls.'));

  if (type === 'csv') return parseCsv(file);
  return parseExcel(file);
}

function parseCsv(file: File): Promise<ParsedImportFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      encoding: 'UTF-8',
      header: false,
      skipEmptyLines: true,
      complete(result) {
        const rows = result.data as string[][];
        if (!rows.length) {
          reject(new Error('File is empty or has no valid rows.'));
          return;
        }
        const headers = rows[0].map((h) => String(h ?? '').trim());
        const dataRows = rows.slice(1).map((row) => row.map((c) => String(c ?? '').trim()));
        resolve({
          fileName: file.name,
          fileType: 'csv',
          headers,
          rows: dataRows,
        });
      },
      error(err) {
        reject(new Error(err.message || 'Failed to parse CSV.'));
      },
    });
  });
}

function parseExcel(file: File): Promise<ParsedImportFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file.'));
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          reject(new Error('Workbook has no sheets.'));
          return;
        }
        const sheet = workbook.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as string[][];
        if (!rows.length) {
          reject(new Error('Sheet is empty.'));
          return;
        }
        const headers = rows[0].map((h) => String(h ?? '').trim());
        const dataRows = rows.slice(1).map((row) => {
          const arr = Array.isArray(row) ? row : [row];
          return headers.map((_, i) => String(arr[i] ?? '').trim());
        });
        resolve({
          fileName: file.name,
          fileType: 'excel',
          headers,
          rows: dataRows,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsBinaryString(file);
  });
}
