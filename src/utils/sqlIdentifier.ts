/**
 * Escape SQL identifiers per database type to avoid "Incorrect syntax near '`'" on MSSQL
 * and to support reserved words / special characters.
 * - MySQL: backticks `
 * - MSSQL: square brackets []
 * - PostgreSQL: double quotes "
 */
import type { DatabaseType } from '@/types/backup.types';

export function escapeIdentifier(name: string, databaseType: DatabaseType): string {
  switch (databaseType) {
    case 'mssql':
      return '[' + String(name).replace(/\]/g, ']]') + ']';
    case 'postgresql':
      return '"' + String(name).replace(/"/g, '""') + '"';
    case 'mysql':
    default:
      return '`' + String(name).replace(/`/g, '``') + '`';
  }
}
