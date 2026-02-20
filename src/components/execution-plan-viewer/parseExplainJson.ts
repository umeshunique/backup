import type { PlanNode, IndexHint } from './types';

let nodeIdCounter = 0;

function nextId(): string {
  return `node-${++nodeIdCounter}`;
}

/** Recursively extract plan nodes from MySQL EXPLAIN JSON (v1 or v2 format) */
function extractNodes(obj: unknown, depth = 0): PlanNode[] {
  const nodes: PlanNode[] = [];

  if (!obj || typeof obj !== 'object') return nodes;

  const o = obj as Record<string, unknown>;

  // MySQL EXPLAIN JSON: direct "table" object (or "buffer" for temp tables)
  const tableObj = o.table ?? o.buffer;
  if (tableObj) {
    const t = tableObj as Record<string, unknown>;
    const tableName = (t.table_name ?? t.name ?? (o.buffer ? '<temporary>' : '?')) as string;
    const accessType = (t.access_type ?? t.type ?? 'unknown') as string;
    const key = (t.key ?? t.used_key ?? null) as string | null;
    const rows = (t.rows_examined_per_scan ?? t.rows_examined_per_join ?? t.rows_produced_per_join ?? t.rows ?? 0) as number;
    const costInfo = t.cost_info as Record<string, unknown> | undefined;
    const cost = costInfo?.query_cost ?? costInfo?.read_cost ?? costInfo?.eval_cost ?? undefined;
    const filtered = (t.filtered ?? t.condition_filter ?? 100) as number;
    const extra = (t.attached_condition ?? t.extra_info ?? t.message ?? '') as string;

    nodes.push({
      id: nextId(),
      operator: getOperatorLabel(accessType, tableName),
      table: tableName,
      accessType,
      key: key ?? undefined,
      rows: typeof rows === 'number' ? rows : undefined,
      cost: typeof cost === 'number' ? cost : typeof cost === 'string' ? parseFloat(cost) : undefined,
      filtered: typeof filtered === 'number' ? filtered : undefined,
      extra: typeof extra === 'string' ? extra : undefined,
      children: [],
      raw: t as Record<string, unknown>,
    });
    return nodes;
  }

  // Nested loop / join - recurse into nested_loop
  if (o.nested_loop && Array.isArray(o.nested_loop)) {
    for (const item of o.nested_loop) {
      nodes.push(...extractNodes(item, depth + 1));
    }
    return nodes;
  }

  // Join / block - recurse
  if (o.blocks && Array.isArray(o.blocks)) {
    for (const block of o.blocks) {
      nodes.push(...extractNodes(block, depth + 1));
    }
    return nodes;
  }

  // query_block - collect from table, nested_loop, ordering_operation, grouping_operation
  if (o.query_block) {
    const qb = o.query_block as Record<string, unknown>;
    if (qb.table) {
      nodes.push(...extractNodes({ table: qb.table }, depth));
    }
    if (qb.nested_loop && Array.isArray(qb.nested_loop)) {
      for (const nl of qb.nested_loop) {
        nodes.push(...extractNodes(nl, depth + 1));
      }
    }
    if (qb.ordering_operation) {
      const ord = qb.ordering_operation as Record<string, unknown>;
      const childNodes = extractNodes(ord, depth + 1);
      if (childNodes.length > 0) {
        nodes.push({
          id: nextId(),
          operator: 'Sort / Order',
          children: childNodes,
          raw: ord as Record<string, unknown>,
        });
      } else {
        nodes.push(...extractNodes(ord, depth + 1));
      }
    }
    if (qb.grouping_operation) {
      const grp = qb.grouping_operation as Record<string, unknown>;
      const childNodes = extractNodes(grp, depth + 1);
      if (childNodes.length > 0) {
        nodes.push({
          id: nextId(),
          operator: 'Group by',
          children: childNodes,
          raw: grp as Record<string, unknown>,
        });
      } else {
        nodes.push(...extractNodes(grp, depth + 1));
      }
    }
    if (qb.duplicate_removal) {
      nodes.push(...extractNodes(qb.duplicate_removal, depth + 1));
    }
    if (qb.windowing) {
      nodes.push(...extractNodes(qb.windowing, depth + 1));
    }
    return nodes;
  }

  // Single object that might have table info
  if (o.table_name || o.name) {
    return extractNodes({ table: o }, depth);
  }

  return nodes;
}

function getOperatorLabel(accessType: string, tableName: string): string {
  const labels: Record<string, string> = {
    const: 'Constant (primary key)',
    eq_ref: 'Unique key lookup',
    ref: 'Index lookup',
    range: 'Range scan',
    index: 'Full index scan',
    ALL: 'Full table scan',
    system: 'System',
    fulltext: 'Full-text',
    ref_or_null: 'Index lookup (or NULL)',
    index_merge: 'Index merge',
    unique_subquery: 'Unique subquery',
    index_subquery: 'Index subquery',
  };
  return labels[accessType] ?? accessType;
}

/** Parse MySQL EXPLAIN FORMAT=JSON into a tree of PlanNode */
export function parseExplainJson(jsonStr: string): PlanNode[] {
  nodeIdCounter = 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];

  const obj = parsed as Record<string, unknown>;

  // Top-level query_block
  if (obj.query_block) {
    return extractNodes(obj, 0);
  }

  // Might be wrapped in another structure
  return extractNodes(parsed, 0);
}

/** Build a single root with flat children (for simple plans) */
export function flattenToTree(nodes: PlanNode[]): PlanNode | null {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  return {
    id: nextId(),
    operator: 'Query',
    children: nodes,
    raw: {},
  };
}

/** Generate index usage hints from plan nodes */
export function generateIndexHints(nodes: PlanNode[]): IndexHint[] {
  const hints: IndexHint[] = [];

  function walk(n: PlanNode) {
    if (n.accessType === 'ALL' && n.table && n.table !== '?') {
      hints.push({
        type: 'warning',
        message: `Full table scan on \`${n.table}\``,
        table: n.table,
        detail: 'Consider adding an index on columns used in WHERE, JOIN, or ORDER BY.',
      });
    }
    if (n.accessType === 'index' && n.table) {
      hints.push({
        type: 'info',
        message: `Full index scan on \`${n.table}\``,
        table: n.table,
        detail: n.key ? `Using index: ${n.key}` : 'No optimal index used.',
      });
    }
    if (n.rows && n.rows > 10000 && n.table) {
      hints.push({
        type: 'suggestion',
        message: `High row estimate (${n.rows.toLocaleString()}) for \`${n.table}\``,
        table: n.table,
        detail: 'Verify index usage and join order.',
      });
    }
    n.children.forEach(walk);
  }

  nodes.forEach(walk);
  return hints;
}

/** Extract total query cost from JSON if present */
export function extractQueryCost(jsonStr: string): number | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const qb = parsed?.query_block as Record<string, unknown> | undefined;
    const costInfo = qb?.cost_info as Record<string, unknown> | undefined;
    const cost = costInfo?.query_cost;
    if (typeof cost === 'number') return cost;
    if (typeof cost === 'string') return parseFloat(cost);
    return null;
  } catch {
    return null;
  }
}
