/**
 * Export Wizard state and types for exporting tables or query results
 * to CSV, Excel, JSON, XML, or SQL INSERT.
 */

export type ExportSourceType = 'table' | 'query';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'xml' | 'sql';

export type CsvDelimiter = ',' | ';' | '\t' | '|';

export interface ExportWizardState {
  // Source step
  sourceType: ExportSourceType;
  serverId: string | null;
  databaseName: string | null;
  /** Table name when sourceType === 'table' */
  tableName: string | null;
  /** Custom SQL when sourceType === 'query' */
  query: string;

  // Format step
  format: ExportFormat;

  // Options (format-specific)
  /** CSV: delimiter */
  csvDelimiter: CsvDelimiter;
  /** CSV/Excel: include header row */
  includeHeaders: boolean;
  /** Encoding for text formats */
  encoding: 'utf-8' | 'utf-16';
  /** SQL INSERT: target table name (default from query/table) */
  sqlInsertTableName: string;
  /** SQL INSERT: rows per statement batch */
  sqlBatchSize: number;
  /** JSON: pretty-print */
  jsonPretty: boolean;
  /** XML: root element name */
  xmlRootName: string;
  /** XML: row element name */
  xmlRowName: string;

  // Execution
  exportStatus: 'idle' | 'running' | 'success' | 'failed';
  exportResult: { rowCount: number; fileName: string; error?: string } | null;
}

export const INITIAL_EXPORT_STATE: ExportWizardState = {
  sourceType: 'table',
  serverId: null,
  databaseName: null,
  tableName: null,
  query: '',
  format: 'csv',
  csvDelimiter: ',',
  includeHeaders: true,
  encoding: 'utf-8',
  sqlInsertTableName: '',
  sqlBatchSize: 100,
  jsonPretty: true,
  xmlRootName: 'root',
  xmlRowName: 'row',
  exportStatus: 'idle',
  exportResult: null,
};
