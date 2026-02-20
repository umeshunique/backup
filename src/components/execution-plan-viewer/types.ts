/** Parsed MySQL EXPLAIN plan node for tree visualization */
export interface PlanNode {
  id: string;
  /** Human-readable operator name */
  operator: string;
  /** Table name if applicable */
  table?: string;
  /** Access type: const, eq_ref, ref, range, index, ALL */
  accessType?: string;
  /** Index used */
  key?: string;
  /** Estimated rows */
  rows?: number;
  /** Cost info */
  cost?: number;
  /** Filtered % */
  filtered?: number;
  /** Extra info */
  extra?: string;
  /** Nested child nodes */
  children: PlanNode[];
  /** Raw JSON for drill-down */
  raw?: Record<string, unknown>;
}

/** Traditional EXPLAIN row (tabular) */
export interface ExplainRow {
  id: number | string;
  select_type?: string;
  table?: string;
  partitions?: string;
  type?: string;
  possible_keys?: string;
  key?: string;
  key_len?: string;
  ref?: string;
  rows?: number | string;
  filtered?: number | string;
  Extra?: string;
  [key: string]: unknown;
}

/** Plan analysis result with hints */
export interface IndexHint {
  type: 'warning' | 'suggestion' | 'info';
  message: string;
  table?: string;
  detail?: string;
}
