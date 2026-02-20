import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ServerConfig } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import {
  Play,
  AlertTriangle,
  Lightbulb,
  Info,
  GitBranch,
  Gauge,
  Key,
  ChevronRight,
  Loader2,
  Copy,
  Zap,
} from 'lucide-react';
import {
  parseExplainJson,
  generateIndexHints,
  extractQueryCost,
} from './parseExplainJson';
import type { PlanNode, ExplainRow, IndexHint } from './types';

const DEFAULT_SQL = 'SELECT * FROM information_schema.tables LIMIT 10';

interface ExecutionPlanViewerProps {
  server: ServerConfig;
  database: string;
}

export function ExecutionPlanViewer({ server, database }: ExecutionPlanViewerProps) {
  const [sqlQuery, setSqlQuery] = useState(DEFAULT_SQL);
  const [format, setFormat] = useState<'traditional' | 'json'>('json');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traditionalRows, setTraditionalRows] = useState<ExplainRow[]>([]);
  const [traditionalColumns, setTraditionalColumns] = useState<string[]>([]);
  const [jsonTree, setJsonTree] = useState<PlanNode[]>([]);
  const [queryCost, setQueryCost] = useState<number | null>(null);
  const [indexHints, setIndexHints] = useState<IndexHint[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const analyzePlan = async () => {
    if (!sqlQuery.trim()) return;

    setError(null);
    setIsAnalyzing(true);
    setTraditionalRows([]);
    setJsonTree([]);
    setQueryCost(null);
    setIndexHints([]);

    const trimmedQuery = sqlQuery.trim();

    try {
      if (format === 'traditional') {
        const explainQuery = `EXPLAIN ${trimmedQuery}`;
        const result = await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: explainQuery,
        });

        if (!result.success || !result.rows || !result.columns) {
          setError(result.error ?? 'Failed to get EXPLAIN result');
          return;
        }

        setTraditionalColumns(result.columns);
        setTraditionalRows(result.rows as ExplainRow[]);

        // Generate hints from traditional format
        const hints: IndexHint[] = [];
        for (const row of result.rows as ExplainRow[]) {
          const type = (row.type ?? row.access_type) as string;
          const table = (row.table ?? row.table_name) as string;
          const rowsEst = typeof row.rows === 'number' ? row.rows : parseInt(String(row.rows ?? 0), 10);
          if (type === 'ALL' && table) {
            hints.push({
              type: 'warning',
              message: `Full table scan on \`${table}\``,
              table,
              detail: 'Consider adding an index on columns used in WHERE, JOIN, or ORDER BY.',
            });
          }
          if (rowsEst > 10000 && table) {
            hints.push({
              type: 'suggestion',
              message: `High row estimate (${rowsEst.toLocaleString()}) for \`${table}\``,
              table,
              detail: 'Verify index usage and join order.',
            });
          }
        }
        setIndexHints(hints);
      } else {
        const explainQuery = `EXPLAIN FORMAT=JSON ${trimmedQuery}`;
        const result = await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: explainQuery,
        });

        if (!result.success || !result.rows || result.rows.length === 0) {
          setError(result.error ?? 'Failed to get EXPLAIN JSON result');
          return;
        }

        // MySQL returns one row with one column containing the JSON (column name varies: EXPLAIN, explain, etc.)
        const firstRow = result.rows[0] as Record<string, unknown>;
        let jsonStr: string | undefined;
        for (const col of result.columns ?? []) {
          const v = firstRow[col];
          if (typeof v === 'string' && (v.trim().startsWith('{') || v.trim().startsWith('['))) {
            jsonStr = v;
            break;
          }
        }
        if (!jsonStr && typeof firstRow.EXPLAIN === 'string') jsonStr = firstRow.EXPLAIN;
        if (!jsonStr && typeof firstRow.explain === 'string') jsonStr = firstRow.explain;
        if (!jsonStr && result.columns?.length) {
          jsonStr = firstRow[result.columns[0]] as string;
        }
        if (typeof jsonStr !== 'string') {
          setError('Could not parse EXPLAIN JSON output');
          return;
        }

        const nodes = parseExplainJson(jsonStr);
        setJsonTree(nodes);
        setQueryCost(extractQueryCost(jsonStr));
        setIndexHints(generateIndexHints(nodes));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <TooltipProvider>
      <div className="grid gap-6 w-full min-w-0 xl:grid-cols-[400px_560px] xl:max-w-[984px]">
        {/* Query panel — fixed width */}
        <div className="min-w-0 w-full xl:w-[400px] xl:shrink-0 xl:max-w-[400px]">
        <Card className="h-full">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Query to Analyze
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Format</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'traditional' | 'json')}
                    className="ml-1 rounded border-0 bg-transparent text-sm font-medium focus:ring-0"
                  >
                    <option value="json">JSON (visual tree)</option>
                    <option value="traditional">Traditional (table)</option>
                  </select>
                </div>
                <Button
                  onClick={analyzePlan}
                  disabled={isAnalyzing || !sqlQuery.trim()}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Plan'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter SELECT query to analyze..."
              className="font-mono min-h-[140px] text-sm"
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') analyzePlan();
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Ctrl+Enter to analyze • Connected to {database}
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Result panel — fixed width */}
        <div className="min-w-0 w-full space-y-6 xl:w-[560px] xl:max-w-[560px] xl:overflow-x-auto">
        {/* Error */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Analysis failed</p>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(traditionalRows.length > 0 || jsonTree.length > 0) && (
          <>
            {/* Cost & Hints summary */}
            {(queryCost !== null || indexHints.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {queryCost !== null && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/10 p-2.5">
                          <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Estimated cost
                          </p>
                          <p className="text-xl font-bold tabular-nums">{queryCost.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {indexHints.length > 0 && (
                  <Card className={cn('sm:col-span-2', queryCost === null && 'sm:col-span-3')}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Index & Performance Hints
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[120px] pr-2">
                        <div className="space-y-2">
                          {indexHints.map((h, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                                h.type === 'warning' && 'border-amber-500/30 bg-amber-500/5',
                                h.type === 'suggestion' && 'border-blue-500/30 bg-blue-500/5',
                                h.type === 'info' && 'border-slate-500/30 bg-slate-500/5'
                              )}
                            >
                              {h.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />}
                              {h.type === 'suggestion' && <Lightbulb className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />}
                              {h.type === 'info' && <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />}
                              <div>
                                <p className="font-medium">{h.message}</p>
                                {h.detail && <p className="text-xs text-muted-foreground mt-0.5">{h.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Tabs defaultValue="plan" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="plan" className="gap-2">
                  <Zap className="h-4 w-4" />
                  {format === 'json' ? 'Operator Tree' : 'Plan Table'}
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-2">
                  <Copy className="h-4 w-4" />
                  Raw Output
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plan" className="mt-4">
                {format === 'json' && jsonTree.length > 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <OperatorTree
                        nodes={jsonTree}
                        expanded={expandedNodes}
                        onToggle={toggleExpand}
                        depth={0}
                      />
                    </CardContent>
                  </Card>
                ) : format === 'traditional' && traditionalRows.length > 0 ? (
                  <Card className="overflow-hidden">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            {traditionalColumns.map((col) => (
                              <TableHead key={col} className="font-mono text-xs font-semibold whitespace-nowrap">
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {traditionalRows.map((row, idx) => (
                            <TableRow key={idx}>
                              {traditionalColumns.map((col) => (
                                <TableCell
                                  key={col}
                                  className={cn(
                                    'font-mono text-xs',
                                    (col === 'type' && row[col] === 'ALL') && 'text-amber-600 dark:text-amber-400 font-medium'
                                  )}
                                >
                                  {formatCell(row[col])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {format === 'traditional' ? (
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-4 max-h-[400px] overflow-y-auto">
                        {JSON.stringify(traditionalRows, null, 2)}
                      </pre>
                    ) : jsonTree.length > 0 ? (
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-4 max-h-[400px] overflow-y-auto">
                        {JSON.stringify(jsonTree, null, 2)}
                      </pre>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty state */}
        {!isAnalyzing && !error && traditionalRows.length === 0 && jsonTree.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
                <GitBranch className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No plan yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Enter a SELECT query above and click <strong>Analyze Plan</strong> to see the visual execution plan, cost breakdown, and index usage hints.
              </p>
              <p className="text-xs text-muted-foreground">
                Supports MySQL EXPLAIN (traditional table) and EXPLAIN FORMAT=JSON (operator tree)
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

interface OperatorTreeProps {
  nodes: PlanNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}

function OperatorTree({ nodes, expanded, onToggle, depth }: OperatorTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded.has(node.id) || !hasChildren;

        return (
          <div key={node.id} className="relative" style={{ marginLeft: depth * 20 }}>
            <div
              className={cn(
                'group flex items-start gap-2 rounded-lg border p-3 transition-colors',
                'hover:border-emerald-500/30 hover:bg-emerald-500/5',
                depth > 0 && 'ml-6 border-l-2 border-l-emerald-500/40'
              )}
            >
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  className="shrink-0 mt-0.5 p-0.5 rounded hover:bg-muted"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronRight
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                  />
                </button>
              )}
              {!hasChildren && <span className="w-5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {node.operator}
                  </span>
                  {node.table && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {node.table}
                    </Badge>
                  )}
                  {node.accessType && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            node.accessType === 'ALL' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          )}
                        >
                          {node.accessType}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Access type</TooltipContent>
                    </Tooltip>
                  )}
                  {node.key && (
                    <Badge variant="outline" className="font-mono text-xs text-cyan-600 dark:text-cyan-400">
                      idx: {node.key}
                    </Badge>
                  )}
                  {node.rows != null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ~{node.rows.toLocaleString()} rows
                    </span>
                  )}
                  {node.cost != null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      cost {node.cost.toFixed(2)}
                    </span>
                  )}
                </div>
                {node.extra && (
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate" title={node.extra}>
                    {node.extra}
                  </p>
                )}
              </div>
            </div>
            {hasChildren && isExpanded && (
              <div className="mt-2">
                <OperatorTree
                  nodes={node.children}
                  expanded={expanded}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
