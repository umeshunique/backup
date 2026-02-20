import type { DatabaseTable, TableColumn } from '@/types/backup.types';

export type GeneratorMode = 'random' | 'pattern' | 'template' | 'skip';

export interface RandomConfig {
  /** For int/decimal: min (inclusive) */
  min?: number;
  /** For int/decimal: max (inclusive) */
  max?: number;
  /** For string: length */
  length?: number;
  /** For date/datetime: start (ISO) */
  dateStart?: string;
  /** For date/datetime: end (ISO) */
  dateEnd?: string;
  /** For bool: probability 0–1 */
  trueProbability?: number;
}

export interface PatternConfig {
  /** Format string, e.g. "email", "phone", "uuid", or custom like "USER-{id}" */
  format: string;
  /** Optional regex for validation */
  regex?: string;
}

export interface TemplateConfig {
  /** Template name: "name", "email", "phone", "address", "company", "uuid", "lorem" */
  template: string;
}

export type ColumnGeneratorConfig =
  | { mode: 'skip' }
  | { mode: 'random'; config: RandomConfig }
  | { mode: 'pattern'; config: PatternConfig }
  | { mode: 'template'; config: TemplateConfig };

export interface TableGeneratorConfig {
  tableName: string;
  rowCount: number;
  columns: Record<string, ColumnGeneratorConfig>;
}

export interface DataGeneratorOptions {
  /** Insert in FK order (parent tables first) */
  respectFkOrder: boolean;
  /** Rows per INSERT statement batch */
  batchSize: number;
  /** Wrap in transaction */
  useTransaction: boolean;
}

export interface DataGeneratorState {
  selectedTableNames: Set<string>;
  tableConfigs: Record<string, TableGeneratorConfig>;
  options: DataGeneratorOptions;
}

export const DEFAULT_OPTIONS: DataGeneratorOptions = {
  respectFkOrder: true,
  batchSize: 1000,
  useTransaction: true,
};

export const TEMPLATE_OPTIONS = [
  { value: 'name', label: 'Full name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Address' },
  { value: 'company', label: 'Company name' },
  { value: 'uuid', label: 'UUID' },
  { value: 'lorem', label: 'Lorem ipsum' },
] as const;

export const PATTERN_PRESETS: { value: string; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone (US)' },
  { value: 'uuid', label: 'UUID' },
  { value: 'zip', label: 'ZIP code' },
  { value: 'custom', label: 'Custom format' },
];

export function inferColumnGenerator(
  col: TableColumn
): ColumnGeneratorConfig {
  if (col.autoIncrement) return { mode: 'skip' };
  const type = (col.dataType || '').toLowerCase();
  if (type.includes('int') || type.includes('decimal') || type.includes('numeric')) {
    return {
      mode: 'random',
      config: { min: 0, max: 99999 },
    };
  }
  if (type.includes('char') || type.includes('text') || type.includes('varchar')) {
    return {
      mode: 'random',
      config: { length: Math.min(col.maxLength ?? 50, 200) },
    };
  }
  if (type.includes('date') || type.includes('time')) {
    return {
      mode: 'random',
      config: {
        dateStart: '2020-01-01T00:00:00',
        dateEnd: new Date().toISOString(),
      },
    };
  }
  if (type.includes('bool') || type === 'bit') {
    return { mode: 'random', config: { trueProbability: 0.5 } };
  }
  return { mode: 'random', config: { length: 32 } };
}

export function getTablesInFkOrder(tables: DatabaseTable[]): DatabaseTable[] {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const deps = new Map<string, Set<string>>();
  for (const t of tables) {
    deps.set(t.name, new Set());
    for (const c of t.constraints ?? []) {
      if (c.type === 'FOREIGN KEY' && c.referencedTable && byName.has(c.referencedTable)) {
        deps.get(t.name)!.add(c.referencedTable);
      }
    }
  }
  const result: DatabaseTable[] = [];
  const added = new Set<string>();
  let changed = true;
  while (changed && result.length < tables.length) {
    changed = false;
    for (const t of tables) {
      if (added.has(t.name)) continue;
      const depSet = deps.get(t.name)!;
      const allDepAdded = [...depSet].every((d) => added.has(d));
      if (allDepAdded) {
        result.push(t);
        added.add(t.name);
        changed = true;
      }
    }
  }
  for (const t of tables) {
    if (!added.has(t.name)) result.push(t);
  }
  return result;
}
