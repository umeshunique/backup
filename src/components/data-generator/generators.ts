/**
 * Value generators for test data (random, pattern, template).
 * Used to produce sample values and eventually SQL literals.
 */

import type { ColumnGeneratorConfig, RandomConfig } from './types';
import type { TableColumn } from '@/types/backup.types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStr(length: number, charset = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += charset[Math.floor(Math.random() * charset.length)];
  }
  return s;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function generateValue(
  col: TableColumn,
  config: ColumnGeneratorConfig,
  rowIndex: number
): unknown {
  if (config.mode === 'skip') return null;
  const type = (col.dataType || '').toLowerCase();

  if (config.mode === 'random') {
    const c = config.config as RandomConfig;
    if (type.includes('int') || type.includes('decimal') || type.includes('numeric')) {
      const min = c.min ?? 0;
      const max = c.max ?? 99999;
      return randomInt(min, max);
    }
    if (type.includes('char') || type.includes('text') || type.includes('varchar')) {
      const len = c.length ?? 20;
      return randomStr(len);
    }
    if (type.includes('date') || type.includes('time')) {
      const start = c.dateStart ? new Date(c.dateStart) : new Date(2020, 0, 1);
      const end = c.dateEnd ? new Date(c.dateEnd) : new Date();
      const d = randomDate(start, end);
      if (type.includes('time') && !type.includes('date')) return d.toISOString().slice(11, 19);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (type.includes('bool') || type === 'bit') {
      const p = c.trueProbability ?? 0.5;
      return Math.random() < p ? 1 : 0;
    }
    return randomStr(c.length ?? 16);
  }

  if (config.mode === 'pattern') {
    const fmt = config.config.format?.toLowerCase() || 'custom';
    if (fmt === 'email') return `user${rowIndex}@example.com`;
    if (fmt === 'phone') return `+1-555-${String(100 + rowIndex % 900).padStart(3, '0')}-${String(1000 + rowIndex % 9000).padStart(4, '0')}`;
    if (fmt === 'uuid') return crypto.randomUUID?.() ?? `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, () => ((Math.random() * 16) | 0).toString(16));
    if (fmt === 'zip') return String(10000 + rowIndex % 90000);
    return config.config.format.replace(/\{id\}/gi, String(rowIndex));
  }

  if (config.mode === 'template') {
    const t = config.config.template?.toLowerCase() || 'lorem';
    if (t === 'name') return `User ${rowIndex}`;
    if (t === 'email') return `user${rowIndex}@test.com`;
    if (t === 'phone') return `555-${String(100 + rowIndex % 900).padStart(3, '0')}-${String(1000 + rowIndex % 9000).padStart(4, '0')}`;
    if (t === 'address') return `${100 + rowIndex} Main St`;
    if (t === 'company') return `Company ${rowIndex}`;
    if (t === 'uuid') return crypto.randomUUID?.() ?? `uuid-${rowIndex}`;
    if (t === 'lorem') return `Lorem ipsum row ${rowIndex}.`;
    return `value_${rowIndex}`;
  }

  return null;
}

/** Escape for SQL string literal (single-quote). */
export function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const s = String(val);
  return "'" + s.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}
