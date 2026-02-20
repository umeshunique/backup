import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronRight,
  Table2,
  Play,
  Code2,
  Plus,
  Trash2,
  GripVertical,
  Link2,
  Filter,
  ArrowUpDown,
  Layers,
  Hash,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Clock,
} from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';
import { DatabaseTable, TableColumn } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import type {
  BuilderTable,
  BuilderColumn,
  BuilderJoin,
  BuilderCondition,
  BuilderOrderBy,
  BuilderGroupBy,
  QueryBuilderState,
} from './queryBuilderTypes';

const OPERATORS = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];
const JOIN_TYPES = ['INNER', 'LEFT', 'RIGHT', 'FULL'] as const;

interface QueryBuilderProps {
  server: ServerConfig;
  database: string;
  tables: DatabaseTable[];
}

function generateId() {
  return `qb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeIdentifier(name: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : `\`${name}\``;
}

function buildSelectSql(state: QueryBuilderState): string {
  if (state.tables.length === 0) return '-- Add tables from the schema browser';
  if (state.columns.length === 0) return '-- Select at least one column';

  const colParts = state.columns.map((c) => {
    const ref = `${escapeIdentifier(c.tableName)}.${escapeIdentifier(c.columnName)}`;
    return c.alias ? `${ref} AS ${escapeIdentifier(c.alias)}` : ref;
  });
  const selectClause = `SELECT\n  ${colParts.join(',\n  ')}`;
  const fromClause = `FROM ${state.tables.map((t) => `${escapeIdentifier(t.tableName)}${t.alias ? ` AS ${escapeIdentifier(t.alias)}` : ''}`).join(', ')}`;

  let joinClause = '';
  if (state.joins.length > 0) {
    const joinKeyword = (type: string) => (type === 'FULL' ? 'FULL OUTER' : type);
    joinClause = state.joins
      .map(
        (j) =>
          `  ${joinKeyword(j.type)} JOIN ${escapeIdentifier(j.rightTable)} ON ${escapeIdentifier(j.leftTable)}.${escapeIdentifier(j.leftColumn)} = ${escapeIdentifier(j.rightTable)}.${escapeIdentifier(j.rightColumn)}`
      )
      .join('\n');
  }

  let whereClause = '';
  if (state.conditions.length > 0) {
    const parts = state.conditions.map((c) => {
      const left = `${escapeIdentifier(c.tableName)}.${escapeIdentifier(c.columnName)}`;
      let expr: string;
      if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
        expr = `${left} ${c.operator}`;
      } else if (c.operator === 'IN' || c.operator === 'NOT IN') {
        expr = `${left} ${c.operator} (${c.value || '...'})`;
      } else {
        const val = /^\d+(\.\d+)?$/.test(c.value) ? c.value : `'${String(c.value).replace(/'/g, "''")}'`;
        expr = `${left} ${c.operator} ${val}`;
      }
      return `${c.andOr === 'OR' ? 'OR ' : ''}${expr}`;
    });
    whereClause = `WHERE\n  ${parts.join('\n  ').replace(/^OR /, '')}`;
  }

  let groupByClause = '';
  if (state.groupBy.length > 0) {
    groupByClause = `GROUP BY\n  ${state.groupBy.map((g) => `${escapeIdentifier(g.tableName)}.${escapeIdentifier(g.columnName)}`).join(',\n  ')}`;
  }

  let orderByClause = '';
  if (state.orderBy.length > 0) {
    orderByClause = `ORDER BY\n  ${state.orderBy.map((o) => `${escapeIdentifier(o.tableName)}.${escapeIdentifier(o.columnName)} ${o.direction}`).join(',\n  ')}`;
  }

  const limitClause = state.limit != null && state.limit > 0 ? `LIMIT ${state.limit}` : '';

  return [selectClause, fromClause, joinClause, whereClause, groupByClause, orderByClause, limitClause]
    .filter(Boolean)
    .join('\n\n');
}

export function QueryBuilder({ server, database, tables }: QueryBuilderProps) {
  const [state, setState] = useState<QueryBuilderState>({
    tables: [],
    columns: [],
    joins: [],
    conditions: [],
    orderBy: [],
    groupBy: [],
    limit: null,
  });
  const [schemaExpanded, setSchemaExpanded] = useState<Record<string, boolean>>({});
  const [schemaSearch, setSchemaSearch] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    success: boolean;
    columns?: string[];
    rows?: any[];
    affectedRows?: number;
    error?: string;
    executionTime?: number;
  } | null>(null);

  const addTable = useCallback((tableName: string) => {
    setState((prev) => {
      if (prev.tables.some((t) => t.tableName === tableName)) return prev;
      return { ...prev, tables: [...prev.tables, { tableName }] };
    });
  }, []);

  const removeTable = useCallback((tableName: string) => {
    setState((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.tableName !== tableName),
      columns: prev.columns.filter((c) => c.tableName !== tableName),
      joins: prev.joins.filter((j) => j.leftTable !== tableName && j.rightTable !== tableName),
      conditions: prev.conditions.filter((c) => c.tableName !== tableName),
      orderBy: prev.orderBy.filter((o) => o.tableName !== tableName),
      groupBy: prev.groupBy.filter((g) => g.tableName !== tableName),
    }));
  }, []);

  const toggleColumn = useCallback((tableName: string, columnName: string) => {
    setState((prev) => {
      const exists = prev.columns.some((c) => c.tableName === tableName && c.columnName === columnName);
      if (exists) {
        return { ...prev, columns: prev.columns.filter((c) => !(c.tableName === tableName && c.columnName === columnName)) };
      }
      return { ...prev, columns: [...prev.columns, { tableName, columnName }] };
    });
  }, []);

  const addJoin = useCallback(() => {
    if (state.tables.length < 2) return;
    setState((prev) => ({
      ...prev,
      joins: [
        ...prev.joins,
        {
          id: generateId(),
          leftTable: prev.tables[0].tableName,
          rightTable: prev.tables[1].tableName,
          leftColumn: '',
          rightColumn: '',
          type: 'INNER',
        },
      ],
    }));
  }, [state.tables.length]);

  const updateJoin = useCallback((id: string, updates: Partial<BuilderJoin>) => {
    setState((prev) => ({
      ...prev,
      joins: prev.joins.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    }));
  }, []);

  const removeJoin = useCallback((id: string) => {
    setState((prev) => ({ ...prev, joins: prev.joins.filter((j) => j.id !== id) }));
  }, []);

  const addCondition = useCallback(() => {
    const firstTable = state.tables[0]?.tableName;
    if (!firstTable) return;
    const firstCol = tables.find((t) => t.name === firstTable)?.columns?.[0]?.name;
    setState((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: generateId(),
          tableName: firstTable,
          columnName: firstCol || '',
          operator: '=',
          value: '',
          andOr: 'AND',
        },
      ],
    }));
  }, [state.tables, tables]);

  const updateCondition = useCallback((id: string, updates: Partial<BuilderCondition>) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setState((prev) => ({ ...prev, conditions: prev.conditions.filter((c) => c.id !== id) }));
  }, []);

  const addOrderBy = useCallback(() => {
    const firstTable = state.tables[0]?.tableName;
    if (!firstTable) return;
    const firstCol = tables.find((t) => t.name === firstTable)?.columns?.[0]?.name;
    setState((prev) => ({
      ...prev,
      orderBy: [
        ...prev.orderBy,
        { id: generateId(), tableName: firstTable, columnName: firstCol || '', direction: 'ASC' as const },
      ],
    }));
  }, [state.tables, tables]);

  const updateOrderBy = useCallback((id: string, updates: Partial<BuilderOrderBy>) => {
    setState((prev) => ({
      ...prev,
      orderBy: prev.orderBy.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }));
  }, []);

  const removeOrderBy = useCallback((id: string) => {
    setState((prev) => ({ ...prev, orderBy: prev.orderBy.filter((o) => o.id !== id) }));
  }, []);

  const addGroupBy = useCallback(() => {
    const firstTable = state.tables[0]?.tableName;
    if (!firstTable) return;
    const firstCol = tables.find((t) => t.name === firstTable)?.columns?.[0]?.name;
    setState((prev) => ({
      ...prev,
      groupBy: [...prev.groupBy, { id: generateId(), tableName: firstTable, columnName: firstCol || '' }],
    }));
  }, [state.tables, tables]);

  const updateGroupBy = useCallback((id: string, updates: Partial<BuilderGroupBy>) => {
    setState((prev) => ({
      ...prev,
      groupBy: prev.groupBy.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  }, []);

  const removeGroupBy = useCallback((id: string) => {
    setState((prev) => ({ ...prev, groupBy: prev.groupBy.filter((g) => g.id !== id) }));
  }, []);

  const generatedSql = useMemo(() => buildSelectSql(state), [state]);
  const canExecute = state.tables.length > 0 && state.columns.length > 0;

  const executeQuery = async () => {
    if (!canExecute) return;
    setIsExecuting(true);
    const start = Date.now();
    try {
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: generatedSql,
      });
      setQueryResult({
        ...result,
        executionTime: Date.now() - start,
      });
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: err.message || 'Execution failed',
        executionTime: Date.now() - start,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const downloadCsv = () => {
    if (!queryResult?.rows?.length || !queryResult.columns) return;
    const csv = [
      queryResult.columns.join(','),
      ...queryResult.rows.map((row) =>
        queryResult.columns!.map((col) => JSON.stringify(row[col] ?? '')).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTables = useMemo(() => {
    if (!schemaSearch.trim()) return tables;
    const q = schemaSearch.toLowerCase();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns?.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [tables, schemaSearch]);

  const tableColumnsMap = useMemo(() => {
    const m = new Map<string, TableColumn[]>();
    tables.forEach((t) => m.set(t.name, t.columns || []));
    return m;
  }, [tables]);

  return (
    <div className="flex flex-1 min-h-0 gap-4 flex-col lg:flex-row">
      {/* Left: Schema browser */}
      <aside className="w-64 shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col max-h-[520px] lg:max-h-none lg:min-h-[400px]">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search tables..."
            value={schemaSearch}
            onChange={(e) => setSchemaSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-2 space-y-0.5">
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tables
            </div>
            {filteredTables.map((table) => {
              const expanded = schemaExpanded[table.name] ?? false;
              const cols = table.columns || [];
              const isAdded = state.tables.some((t) => t.tableName === table.name);
              return (
                <div key={table.name} className="rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSchemaExpanded((prev) => ({ ...prev, [table.name]: !prev[table.name] }));
                      addTable(table.name);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-md transition-colors',
                      isAdded
                        ? 'bg-primary/15 text-primary'
                        : 'hover:bg-muted/70 text-foreground'
                    )}
                  >
                    {cols.length > 0 ? (
                      expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <Table2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">{table.name}</span>
                    {isAdded && (
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1">
                        In query
                      </Badge>
                    )}
                  </button>
                  {expanded && cols.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-0.5 bg-muted/30">
                      {cols.map((col) => {
                        const selected = state.columns.some(
                          (c) => c.tableName === table.name && c.columnName === col.name
                        );
                        return (
                          <button
                            key={col.name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumn(table.name, col.name);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs font-mono',
                              selected ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-muted-foreground'
                            )}
                          >
                            <Checkbox checked={selected} className="pointer-events-none h-3 w-3" />
                            <span className="truncate">{col.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{col.dataType}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredTables.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted-foreground">No tables match.</p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Center: Builder + SQL + Results (Results always visible below) */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
        <Tabs defaultValue="structure" className="flex flex-col min-h-0">
          <TabsList className="w-full justify-start h-9 shrink-0">
            <TabsTrigger value="structure" className="text-xs">Query design</TabsTrigger>
            <TabsTrigger value="sql" className="text-xs">Generated SQL</TabsTrigger>
          </TabsList>
          <TabsContent value="structure" className="flex-1 mt-3 min-h-0 overflow-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Table2 className="h-4 w-4" />
                    Tables in query
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  {state.tables.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Click a table in the schema browser to add it.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {state.tables.map((t) => (
                        <Badge
                          key={t.tableName}
                          variant="secondary"
                          className="gap-1.5 py-1.5 pr-1 pl-2 font-mono text-xs"
                        >
                          {t.tableName}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded hover:bg-destructive/20 hover:text-destructive"
                            onClick={() => removeTable(t.tableName)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GripVertical className="h-4 w-4" />
                    Selected columns
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  {state.columns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Expand a table and check columns to add.</p>
                  ) : (
                    <ul className="space-y-1 text-sm font-mono">
                      {state.columns.map((c) => (
                        <li key={`${c.tableName}.${c.columnName}`} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{c.tableName}.</span>
                          <span>{c.columnName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => toggleColumn(c.tableName, c.columnName)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {state.tables.length >= 2 && (
                <Card>
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Joins
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addJoin}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add join
                    </Button>
                  </CardHeader>
                  <CardContent className="py-0 pb-3 space-y-2">
                    {state.joins.map((j) => {
                      const leftCols = tableColumnsMap.get(j.leftTable) || [];
                      const rightCols = tableColumnsMap.get(j.rightTable) || [];
                      return (
                        <div
                          key={j.id}
                          className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border bg-muted/20"
                        >
                          <Select
                            value={j.leftTable}
                            onValueChange={(v) => updateJoin(j.id, { leftTable: v, leftColumn: '' })}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {state.tables.map((t) => (
                                <SelectItem key={t.tableName} value={t.tableName}>
                                  {t.tableName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={j.leftColumn}
                            onValueChange={(v) => updateJoin(j.id, { leftColumn: v })}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue placeholder="Column" />
                            </SelectTrigger>
                            <SelectContent>
                              {leftCols.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={j.type}
                            onValueChange={(v: BuilderJoin['type']) => updateJoin(j.id, { type: v })}
                          >
                            <SelectTrigger className="w-[90px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {JOIN_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={j.rightTable}
                            onValueChange={(v) => updateJoin(j.id, { rightTable: v, rightColumn: '' })}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {state.tables.map((t) => (
                                <SelectItem key={t.tableName} value={t.tableName}>
                                  {t.tableName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={j.rightColumn}
                            onValueChange={(v) => updateJoin(j.id, { rightColumn: v })}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue placeholder="Column" />
                            </SelectTrigger>
                            <SelectContent>
                              {rightCols.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeJoin(j.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    WHERE
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition} disabled={state.tables.length === 0}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add condition
                  </Button>
                </CardHeader>
                <CardContent className="py-0 pb-3 space-y-2">
                  {state.conditions.map((c, idx) => {
                    const tableCols = tableColumnsMap.get(c.tableName) || [];
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border bg-muted/20"
                      >
                        {idx > 0 && (
                          <Select
                            value={c.andOr}
                            onValueChange={(v: 'AND' | 'OR') => updateCondition(c.id, { andOr: v })}
                          >
                            <SelectTrigger className="w-[70px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Select
                          value={c.tableName}
                          onValueChange={(v) => updateCondition(c.id, { tableName: v, columnName: '' })}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {state.tables.map((t) => (
                              <SelectItem key={t.tableName} value={t.tableName}>
                                {t.tableName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={c.columnName}
                          onValueChange={(v) => updateCondition(c.id, { columnName: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {tableCols.map((col) => (
                              <SelectItem key={col.name} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={c.operator}
                          onValueChange={(v) => updateCondition(c.id, { operator: v })}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op} value={op}>
                                {op}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {c.operator !== 'IS NULL' && c.operator !== 'IS NOT NULL' && (
                          <Input
                            placeholder="Value"
                            value={c.value}
                            onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                            className="h-8 w-32 text-xs font-mono"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeCondition(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    ORDER BY
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderBy} disabled={state.tables.length === 0}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="py-0 pb-3 space-y-2">
                  {state.orderBy.map((o) => {
                    const tableCols = tableColumnsMap.get(o.tableName) || [];
                    return (
                      <div key={o.id} className="flex flex-wrap items-center gap-2">
                        <Select
                          value={o.tableName}
                          onValueChange={(v) => updateOrderBy(o.id, { tableName: v, columnName: '' })}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {state.tables.map((t) => (
                              <SelectItem key={t.tableName} value={t.tableName}>
                                {t.tableName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={o.columnName}
                          onValueChange={(v) => updateOrderBy(o.id, { columnName: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {tableCols.map((col) => (
                              <SelectItem key={col.name} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={o.direction}
                          onValueChange={(v: 'ASC' | 'DESC') => updateOrderBy(o.id, { direction: v })}
                        >
                          <SelectTrigger className="w-[90px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASC">ASC</SelectItem>
                            <SelectItem value="DESC">DESC</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOrderBy(o.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    GROUP BY
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addGroupBy} disabled={state.tables.length === 0}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="py-0 pb-3 space-y-2">
                  {state.groupBy.map((g) => {
                    const tableCols = tableColumnsMap.get(g.tableName) || [];
                    return (
                      <div key={g.id} className="flex flex-wrap items-center gap-2">
                        <Select
                          value={g.tableName}
                          onValueChange={(v) => updateGroupBy(g.id, { tableName: v, columnName: '' })}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {state.tables.map((t) => (
                              <SelectItem key={t.tableName} value={t.tableName}>
                                {t.tableName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={g.columnName}
                          onValueChange={(v) => updateGroupBy(g.id, { columnName: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {tableCols.map((col) => (
                              <SelectItem key={col.name} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeGroupBy(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    LIMIT
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={state.limit ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setState((prev) => ({ ...prev, limit: v === '' ? null : Math.max(0, parseInt(v, 10) || 0) }));
                    }}
                    className="w-28 h-8 text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sql" className="flex-1 mt-3 min-h-0 overflow-auto">
            <Card className="flex flex-col min-h-[200px]">
              <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Generated SQL
                </CardTitle>
                <Button
                  size="sm"
                  onClick={executeQuery}
                  disabled={!canExecute || isExecuting}
                  className="gap-1.5 shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isExecuting ? 'Running…' : 'Run query'}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="min-h-[180px] max-h-[320px] p-4 rounded-lg bg-muted/50 border border-border font-mono text-xs overflow-auto whitespace-pre overflow-x-auto" style={{ wordBreak: 'normal' }}>
                  {generatedSql}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">Run the query to see results below.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Results: always visible below Design / SQL so user sees output without switching tabs */}
        <Card className="flex flex-col flex-1 min-h-0 shrink-0 border-t border-border/80 mt-1">
          <CardHeader className="py-3 flex flex-row items-center justify-between gap-2 flex-wrap border-b border-border/50">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              {queryResult ? (
                queryResult.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Query results
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Error
                  </>
                )
              ) : (
                <>
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  Query results
                </>
              )}
              {queryResult?.executionTime != null && (
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Clock className="h-3 w-3" />
                  {queryResult.executionTime} ms
                </Badge>
              )}
              {queryResult?.rows && queryResult.rows.length > 0 && queryResult.columns && (
                <Badge variant="outline" className="text-xs font-normal">
                  {queryResult.rows.length} row{queryResult.rows.length !== 1 ? 's' : ''} · {queryResult.columns.length} column{queryResult.columns.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {queryResult?.rows && queryResult.rows.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              )}
              <Button
                size="sm"
                onClick={executeQuery}
                disabled={!canExecute || isExecuting}
                variant={queryResult?.rows && queryResult.rows.length > 0 ? 'outline' : 'default'}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                {isExecuting ? 'Running…' : 'Run'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0 overflow-auto py-3">
            {!queryResult && (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg bg-muted/30 border border-dashed border-border">
                <Play className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No results yet</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                  Build your query in <strong>Query design</strong>, then run it from <strong>Generated SQL</strong> or the Run button above. Results will appear here.
                </p>
              </div>
            )}
            {queryResult?.error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-mono text-destructive">{queryResult.error}</p>
              </div>
            )}
            {queryResult?.rows && queryResult.rows.length > 0 && (
              <div className="rounded-lg border border-border overflow-auto min-h-[380px] max-h-[min(60vh,560px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {queryResult.columns?.map((col) => (
                        <TableHead key={col} className="font-mono text-xs whitespace-nowrap min-w-[100px]">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {queryResult.columns?.map((col) => (
                          <TableCell key={col} className="font-mono text-xs min-w-[100px] max-w-[400px]" title={typeof row[col] === 'string' ? row[col] : undefined}>
                            {row[col] === null ? (
                              <span className="text-muted-foreground italic">NULL</span>
                            ) : typeof row[col] === 'object' ? (
                              JSON.stringify(row[col])
                            ) : (
                              String(row[col])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {queryResult?.success && queryResult.affectedRows != null && (!queryResult.rows || queryResult.rows.length === 0) && (
              <p className="text-sm text-muted-foreground py-4">
                No rows returned.{queryResult.affectedRows > 0 && ` ${queryResult.affectedRows} row(s) affected.`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
