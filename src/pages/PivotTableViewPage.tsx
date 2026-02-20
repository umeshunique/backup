import { useEffect, useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  LayoutGrid,
  Database,
  Server as ServerIcon,
  Plus,
  Play,
  Rows3,
  Columns3,
  Hash,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type PivotAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

function getRowLabel(rowKeys: string[], row: Record<string, unknown>): string {
  return rowKeys.map((k) => String(row[k] ?? '')).join(' \u2014 ');
}

function getColLabel(colKeys: string[], row: Record<string, unknown>): string {
  return colKeys.map((k) => String(row[k] ?? '')).join(' \u2014 ');
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function aggregate(values: number[], agg: PivotAggregation): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function buildPivot(
  rows: Record<string, unknown>[],
  rowKeys: string[],
  colKeys: string[],
  valueKey: string,
  agg: PivotAggregation
): {
  rowLabels: string[];
  colLabels: string[];
  getCell: (rowLabel: string, colLabel: string) => number;
} {
  const rowLabelSet = new Set<string>();
  const colLabelSet = new Set<string>();
  const bucket: Record<string, Record<string, number[]>> = {};

  for (const row of rows) {
    const rLabel = getRowLabel(rowKeys, row);
    const cLabel = getColLabel(colKeys, row);
    rowLabelSet.add(rLabel);
    colLabelSet.add(cLabel);
    if (!bucket[rLabel]) bucket[rLabel] = {};
    if (!bucket[rLabel][cLabel]) bucket[rLabel][cLabel] = [];
    const val = valueKey ? toNumber(row[valueKey]) : 1;
    bucket[rLabel][cLabel].push(val);
  }

  const rowLabels = Array.from(rowLabelSet).sort();
  const colLabels = Array.from(colLabelSet).sort();

  const getCell = (rowLabel: string, colLabel: string): number => {
    const list = bucket[rowLabel]?.[colLabel];
    if (!list || list.length === 0) return 0;
    return aggregate(list, agg);
  };

  return { rowLabels, colLabels, getCell };
}

const DEFAULT_SQL = `SELECT category, region, year, amount FROM (
  SELECT 'A' AS category, 'North' AS region, 2023 AS year, 100 AS amount
  UNION ALL SELECT 'A', 'North', 2024, 120
  UNION ALL SELECT 'A', 'South', 2023, 90
  UNION ALL SELECT 'A', 'South', 2024, 110
  UNION ALL SELECT 'B', 'North', 2023, 200
  UNION ALL SELECT 'B', 'North', 2024, 220
  UNION ALL SELECT 'B', 'South', 2023, 180
  UNION ALL SELECT 'B', 'South', 2024, 190
) t;`;

export function PivotTableViewPage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    setActiveTab,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [sqlQuery, setSqlQuery] = useState(DEFAULT_SQL);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    success: boolean;
    columns?: string[];
    rows?: Record<string, unknown>[];
    error?: string;
  } | null>(null);

  const [rowKeys, setRowKeys] = useState<string[]>([]);
  const [colKeys, setColKeys] = useState<string[]>([]);
  const [valueKey, setValueKey] = useState<string>('');
  const [aggregation, setAggregation] = useState<PivotAggregation>('sum');

  /** Sentinel for "Count (no column)" – Radix Select disallows value="". */
  const VALUE_COUNT_ONLY = '__count__';
  const effectiveValueKey = valueKey === VALUE_COUNT_ONLY ? '' : valueKey;

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!selectedServerId) {
      setSelectedDatabase(null);
      return;
    }
    setSelectedDatabase(null);
    setLoadingDatabases(true);
    loadDatabasesForServer(selectedServerId).finally(() => setLoadingDatabases(false));
  }, [selectedServerId, loadDatabasesForServer]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const canRunQueries = selectedServer && selectedDatabase;

  const columns = queryResult?.columns ?? [];
  const flatRows = queryResult?.rows ?? [];
  const hasResults = queryResult?.success && flatRows.length > 0;

  const pivotConfigValid =
    hasResults &&
    rowKeys.length > 0 &&
    colKeys.length > 0 &&
    (effectiveValueKey ? true : aggregation === 'count');

  const pivotData = useMemo(() => {
    if (!pivotConfigValid || !hasResults) return null;
    return buildPivot(flatRows, rowKeys, colKeys, effectiveValueKey, aggregation);
  }, [flatRows, rowKeys, colKeys, effectiveValueKey, aggregation, pivotConfigValid, hasResults]);

  const runQuery = async () => {
    if (!selectedServer || !selectedDatabase || !sqlQuery.trim()) return;
    setIsExecuting(true);
    setQueryResult(null);
    try {
      const result = await apiClient.executeQuery({
        host: selectedServer.host,
        port: selectedServer.port,
        user: selectedServer.username,
        password: selectedServer.password,
        database: selectedDatabase,
        type: selectedServer.databaseType,
        query: sqlQuery.trim(),
      });
      setQueryResult({
        success: result.success ?? false,
        columns: result.columns,
        rows: result.rows ?? [],
        error: result.error,
      });
      if (result.success && result.rows?.length !== undefined) {
        toast({
          title: 'Query executed',
          description: `${result.rows.length} row(s) returned.`,
        });
      }
      if (result.error) {
        toast({ variant: 'destructive', title: 'Query failed', description: result.error });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setQueryResult({ success: false, error: message });
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setIsExecuting(false);
    }
  };

  const addRowKey = (col: string) => {
    if (!rowKeys.includes(col)) setRowKeys([...rowKeys, col]);
  };
  const removeRowKey = (col: string) => setRowKeys(rowKeys.filter((c) => c !== col));
  const addColKey = (col: string) => {
    if (!colKeys.includes(col)) setColKeys([...colKeys, col]);
  };
  const removeColKey = (col: string) => setColKeys(colKeys.filter((c) => c !== col));

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2.5">
            <LayoutGrid className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pivot Table View</h2>
            <p className="text-sm text-muted-foreground">
              Pivot query results: rows, columns, values, and aggregation in grid
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ServerIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No servers configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add a database server to run queries and build pivot tables. Go to Servers to add your first connection.
            </p>
            <Button onClick={() => setActiveTab('servers')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add server
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/10 p-2.5">
          <LayoutGrid className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Pivot Table View</h2>
          <p className="text-sm text-muted-foreground">
            Pivot query results: rows, columns, values, and aggregation in grid
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[200px]">
            <Label>Server</Label>
            <Select
              value={selectedServerId ?? ''}
              onValueChange={(v) => {
                setSelectedServerId(v || null);
                setSelectedDatabase(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <ServerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.name}
                      <span className="text-muted-foreground text-xs">({s.host}:{s.port})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Label>Database</Label>
            <Select
              value={selectedDatabase ?? ''}
              onValueChange={(v) => setSelectedDatabase(v || null)}
              disabled={!selectedServerId || loadingDatabases}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingDatabases ? 'Loading…' : 'Select database'} />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.name} value={db.name}>
                    {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedServer && selectedDatabase && (
            <Badge variant="secondary" className="font-mono text-xs">
              {selectedServer.name} / {selectedDatabase}
            </Badge>
          )}
        </CardContent>
      </Card>

      {canRunQueries && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">Query</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Run a SELECT query. Result columns will be used for Rows, Columns, and Values below.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pivot-sql">SQL</Label>
              <Textarea
                id="pivot-sql"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT ..."
                className="min-h-[120px] font-mono text-sm"
              />
            </div>
            <Button onClick={runQuery} disabled={isExecuting} className="gap-2">
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run query
            </Button>
            {queryResult && !queryResult.success && queryResult.error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{queryResult.error}</span>
              </div>
            )}
            {hasResults && (
              <p className="text-sm text-muted-foreground">
                {flatRows.length} row(s), {columns.length} column(s): {columns.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {hasResults && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">Pivot configuration</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Choose which columns are row dimensions, column dimensions, and the value to aggregate.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Rows3 className="h-4 w-4" />
                  Rows
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {rowKeys.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="cursor-pointer gap-1"
                      onClick={() => removeRowKey(c)}
                    >
                      {c} ×
                    </Badge>
                  ))}
                  {rowKeys.length === 0 && (
                    <span className="text-xs text-muted-foreground">Add columns</span>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v) addRowKey(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add row dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns
                      .filter((c) => !rowKeys.includes(c))
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Columns3 className="h-4 w-4" />
                  Columns
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {colKeys.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="cursor-pointer gap-1"
                      onClick={() => removeColKey(c)}
                    >
                      {c} ×
                    </Badge>
                  ))}
                  {colKeys.length === 0 && (
                    <span className="text-xs text-muted-foreground">Add columns</span>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v) addColKey(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add column dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns
                      .filter((c) => !colKeys.includes(c))
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Values & aggregation
                </Label>
                <Select
                  value={valueKey || VALUE_COUNT_ONLY}
                  onValueChange={(v) => setValueKey(v === VALUE_COUNT_ONLY ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Value column (optional for Count)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VALUE_COUNT_ONLY}>Count (no column)</SelectItem>
                    {columns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={aggregation}
                  onValueChange={(v) => setAggregation(v as PivotAggregation)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="min">Min</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pivotData && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Pivot grid</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Rows: {rowKeys.join(', ')} · Columns: {colKeys.join(', ')} · {effectiveValueKey || 'Count'} ({aggregation})
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px] sticky left-0 bg-muted/80 font-semibold">
                      {rowKeys.join(' \u2014 ')}
                    </TableHead>
                    {pivotData.colLabels.map((col) => (
                      <TableHead key={col} className="text-right min-w-[80px]">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotData.rowLabels.map((rowLabel) => (
                    <TableRow key={rowLabel}>
                      <TableCell className="font-medium sticky left-0 bg-background">
                        {rowLabel}
                      </TableCell>
                      {pivotData.colLabels.map((colLabel) => (
                        <TableCell key={colLabel} className="text-right tabular-nums">
                          {pivotData.getCell(rowLabel, colLabel).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: aggregation === 'avg' ? 2 : 0,
                          })}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {canRunQueries && !selectedDatabase && databases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Select a database above to run SQL and build pivot tables.
          </CardContent>
        </Card>
      )}

      {selectedServerId && selectedServer && databases.length === 0 && !loadingDatabases && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No databases found on this server. Try another server.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
