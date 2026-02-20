import React, { useEffect, useState, useCallback } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import {
  TrendingUp,
  Database,
  Server as ServerIcon,
  Plus,
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import type { ServerConfig } from '@/types/backup.types';
import { cn } from '@/lib/utils';

export interface SlowQueryRow {
  id: string;
  normalizedQuery: string;
  sqlText: string;
  executionCount: number;
  avgTimeMs: number;
  totalTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  databaseName: string;
  hints: string[];
}

const TOP_N_OPTIONS = [10, 25, 50, 100] as const;
const ALL_DATABASES_VALUE = '__all__';

function formatDurationMs(ms: number): string {
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function SlowQueryAnalyzerPage() {
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
  const [topN, setTopN] = useState<number>(25);
  const [slowQueries, setSlowQueries] = useState<SlowQueryRow[]>([]);
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(false);
  const [errorSlowQueries, setErrorSlowQueries] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchSlowQueries = useCallback(async () => {
    if (!selectedServerId) {
      setSlowQueries([]);
      setErrorSlowQueries(null);
      return;
    }
    setLoadingSlowQueries(true);
    setErrorSlowQueries(null);
    try {
      const res = await apiClient.getSlowQueries(selectedServerId, {
        database: selectedDatabase ?? undefined,
        topN,
      });
      setSlowQueries(res.queries ?? []);
    } catch (err) {
      setErrorSlowQueries(err instanceof Error ? err.message : 'Failed to load slow queries');
      setSlowQueries([]);
    } finally {
      setLoadingSlowQueries(false);
    }
  }, [selectedServerId, selectedDatabase, topN]);

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

  useEffect(() => {
    fetchSlowQueries();
  }, [fetchSlowQueries]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Slow Query Analyzer</h2>
            <p className="text-sm text-muted-foreground">
              Top N slow queries with execution count, avg time, and recommendation hints.
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
              Add a database server to analyze slow queries. Go to Servers to add your first connection.
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
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Slow Query Analyzer</h2>
            <p className="text-sm text-muted-foreground">
              Top N slow queries with execution count, avg time, and recommendation hints.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span>
            Data is loaded from MySQL performance_schema (events_statements_summary_by_digest). Select a server and optionally filter by database.
          </span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Connection & options
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
                        <span className="text-muted-foreground text-xs">
                          ({s.host}:{s.port})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label>Database</Label>
              <Select
                value={selectedDatabase ?? ALL_DATABASES_VALUE}
                onValueChange={(v) => setSelectedDatabase(v === ALL_DATABASES_VALUE ? null : v)}
                disabled={!selectedServerId || loadingDatabases}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingDatabases ? 'Loading…' : 'All databases'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DATABASES_VALUE}>All databases</SelectItem>
                  {databases.map((db) => (
                    <SelectItem key={db.name} value={db.name}>
                      {db.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[140px]">
              <Label>Top N</Label>
              <Select
                value={String(topN)}
                onValueChange={(v) => setTopN(Number(v) as typeof topN)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOP_N_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Top {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => fetchSlowQueries()}
              disabled={!selectedServerId || loadingSlowQueries}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', loadingSlowQueries && 'animate-spin')} />
              Refresh
            </Button>
            {selectedServer && (
              <Badge variant="secondary" className="font-mono text-xs">
                {selectedServer.name}
                {selectedDatabase ? ` / ${selectedDatabase}` : ' (all DBs)'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {errorSlowQueries && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorSlowQueries}
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Top slow queries
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {loadingSlowQueries ? 'Loading…' : `${slowQueries.length} quer${slowQueries.length !== 1 ? 'ies' : 'y'}`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="w-12 text-right">#</TableHead>
                    <TableHead className="min-w-[220px]">Query</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Exec count</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Avg time</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total time</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Min / Max</TableHead>
                    <TableHead>Database</TableHead>
                    <TableHead className="min-w-[180px]">Recommendations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSlowQueries ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Loading slow queries…
                      </TableCell>
                    </TableRow>
                  ) : slowQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        {selectedServerId
                          ? 'No slow queries in the selected range, or performance_schema may be disabled.'
                          : 'Select a server to load slow queries from MySQL performance_schema.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    slowQueries.map((row, index) => {
                      const isExpanded = expandedRowId === row.id;
                      const sqlPreview =
                        row.normalizedQuery.length > 50
                          ? row.normalizedQuery.slice(0, 50).trim() + '…'
                          : row.normalizedQuery;
                      return (
                        <React.Fragment key={row.id}>
                          <TableRow
                            className={cn(
                              'cursor-pointer',
                              isExpanded && 'bg-muted/50'
                            )}
                            onClick={() =>
                              setExpandedRowId(isExpanded ? null : row.id)
                            }
                          >
                            <TableCell className="w-8 py-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[280px] truncate py-2" title={row.normalizedQuery}>
                              {sqlPreview}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">
                              {formatCount(row.executionCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">
                              {formatDurationMs(row.avgTimeMs)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">
                              {formatDurationMs(row.totalTimeMs)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2 whitespace-nowrap">
                              {formatDurationMs(row.minTimeMs)} / {formatDurationMs(row.maxTimeMs)}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="font-normal text-xs">
                                {row.databaseName}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {row.hints.slice(0, 2).map((hint, i) => (
                                  <Tooltip key={i}>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex">
                                        <Badge
                                          variant="secondary"
                                          className="text-xs font-normal cursor-help max-w-[160px] truncate"
                                        >
                                          <Lightbulb className="h-3 w-3 mr-0.5 shrink-0 inline" />
                                          {hint.length > 24 ? hint.slice(0, 24) + '…' : hint}
                                        </Badge>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm">
                                      {hint}
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                                {row.hints.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{row.hints.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={9} className="p-4 space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Full SQL (example)</p>
                                  <div className="rounded-md bg-background border p-3 font-mono text-xs overflow-x-auto whitespace-pre break-all">
                                    {row.sqlText}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                    Recommendation hints
                                  </p>
                                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                    {row.hints.map((hint, i) => (
                                      <li key={i}>{hint}</li>
                                    ))}
                                  </ul>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
