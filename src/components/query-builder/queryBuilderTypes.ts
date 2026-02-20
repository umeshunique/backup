import type { DatabaseTable, TableColumn } from '@/types/backup.types';

export interface BuilderTable {
  tableName: string;
  alias?: string;
}

export interface BuilderColumn {
  tableName: string;
  columnName: string;
  alias?: string;
}

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

export interface BuilderJoin {
  id: string;
  leftTable: string;
  rightTable: string;
  leftColumn: string;
  rightColumn: string;
  type: JoinType;
}

export interface BuilderCondition {
  id: string;
  tableName: string;
  columnName: string;
  operator: string;
  value: string;
  andOr: 'AND' | 'OR';
}

export interface BuilderOrderBy {
  id: string;
  tableName: string;
  columnName: string;
  direction: 'ASC' | 'DESC';
}

export interface BuilderGroupBy {
  id: string;
  tableName: string;
  columnName: string;
}

export interface QueryBuilderState {
  tables: BuilderTable[];
  columns: BuilderColumn[];
  joins: BuilderJoin[];
  conditions: BuilderCondition[];
  orderBy: BuilderOrderBy[];
  groupBy: BuilderGroupBy[];
  limit: number | null;
}

export type TableWithColumns = DatabaseTable & { columns?: TableColumn[] };
