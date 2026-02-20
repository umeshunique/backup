/**
 * Format query result rows into CSV, JSON, XML, SQL INSERT, or Excel (via xlsx).
 * Used for client-side export and download.
 */

import type { ExportWizardState, CsvDelimiter } from './exportWizardTypes';
import * as XLSX from 'xlsx';

function escapeCsvCell(value: unknown, delimiter: string): string {
  const s = value == null ? '' : String(value);
  if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatAsCsv(
  columns: string[],
  rows: unknown[][],
  options: {
    delimiter: CsvDelimiter;
    includeHeaders: boolean;
  }
): string {
  const { delimiter, includeHeaders } = options;
  const lines: string[] = [];
  if (includeHeaders) {
    lines.push(columns.map((c) => escapeCsvCell(c, delimiter)).join(delimiter));
  }
  for (const row of rows) {
    lines.push(
      row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)
    );
  }
  return lines.join('\r\n');
}

export function formatAsJson(
  columns: string[],
  rows: unknown[][],
  options: { pretty: boolean }
): string {
  const objects = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  return options.pretty
    ? JSON.stringify(objects, null, 2)
    : JSON.stringify(objects);
}

export function formatAsXml(
  columns: string[],
  rows: unknown[][],
  options: { rootName: string; rowName: string }
): string {
  const { rootName, rowName } = options;
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${rootName}>`,
  ];
  for (const row of rows) {
    parts.push(`  <${rowName}>`);
    columns.forEach((col, i) => {
      const tag = col.replace(/[^a-zA-Z0-9_-]/g, '_') || 'col';
      parts.push(`    <${tag}>${escape(row[i])}</${tag}>`);
    });
    parts.push(`  </${rowName}>`);
  }
  parts.push(`</${rootName}>`);
  return parts.join('\n');
}

function sqlEscape(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const s = String(value);
  return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

export function formatAsSqlInsert(
  columns: string[],
  rows: unknown[][],
  options: { tableName: string; batchSize: number }
): string {
  const { tableName, batchSize } = options;
  const table = tableName || 'export_table';
  const colList = columns.map((c) => `\`${c.replace(/`/g, '``')}\``).join(', ');
  const statements: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesList = batch
      .map(
        (row) =>
          `(${row.map((cell) => sqlEscape(cell)).join(', ')})`
      )
      .join(',\n  ');
    statements.push(`INSERT INTO \`${table.replace(/`/g, '``')}\` (${colList}) VALUES\n  ${valuesList};`);
  }
  return statements.join('\n\n');
}

export function buildExcelBlob(
  columns: string[],
  rows: unknown[][],
  options: { includeHeaders: boolean }
): Blob {
  const { includeHeaders } = options;
  const data: unknown[][] = includeHeaders ? [columns, ...rows] : rows;
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function getExportFileName(
  state: ExportWizardState,
  extension: string
): string {
  const base =
    state.sourceType === 'table' && state.tableName
      ? state.tableName
      : 'export';
  return `${base}_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(' ', '_')}.${extension}`;
}
