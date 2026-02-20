/**
 * Import Wizard state and types for file import (CSV, Excel)
 * with mapping, validation, and duplicate handling.
 */

export type ImportFileType = 'csv' | 'excel';

export type DuplicateMode = 'skip' | 'update' | 'replace' | 'fail';

export interface ParsedImportFile {
  fileName: string;
  fileType: ImportFileType;
  /** Column names from first row */
  headers: string[];
  /** Data rows (array of column values in header order) */
  rows: string[][];
}

/** Map file column index (or header name) to target table column name. Empty string = skip. */
export type ColumnMapping = Record<string, string>;

export interface ValidationIssue {
  rowIndex: number; // 0-based
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportWizardState {
  // File step
  parsedFile: ParsedImportFile | null;
  fileError: string | null;

  // Mapping step
  serverId: string | null;
  databaseName: string | null;
  tableName: string | null;
  /** file header -> table column name (empty = skip) */
  columnMapping: ColumnMapping;

  // Validation (computed)
  validationErrors: ValidationIssue[];
  validationWarnings: ValidationIssue[];

  // Duplicate step
  duplicateMode: DuplicateMode;

  // Execution
  importStatus: 'idle' | 'running' | 'success' | 'failed';
  importResult: { inserted: number; updated: number; skipped: number; failed: number; errors: string[] } | null;
}

export const INITIAL_IMPORT_STATE: ImportWizardState = {
  parsedFile: null,
  fileError: null,
  serverId: null,
  databaseName: null,
  tableName: null,
  columnMapping: {},
  validationErrors: [],
  validationWarnings: [],
  duplicateMode: 'skip',
  importStatus: 'idle',
  importResult: null,
};
