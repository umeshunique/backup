/**
 * Data Lineage — Trace data flow: tables, columns, ETL. Impact analysis for changes.
 * Full-feature UI with server/database context; backend APIs can be wired later.
 */

import { useEffect, useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Network,
  ArrowRight,
  ArrowDown,
  Database,
  Server as ServerIcon,
  Table2,
  GitBranch,
  Workflow,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type { ServerConfig } from '@/types/backup.types';
import type { DatabaseTable, TableColumn } from '@/types/backup.types';
import { toast } from '@/hooks/use-toast';

// --- Lineage node/edge (mock) ---
type LineageNodeType = 'table' | 'column' | 'view' | 'etl';

interface LineageNode {
  id: string;
  label: string;
  type: LineageNodeType;
  schema?: string;
  table?: string;
  column?: string;
}

interface LineageEdge {
  fromId: string;
  toId: string;
  label?: string;
  transform?: string;
}

// --- Impact item (mock) ---
interface ImpactItem {
  id: string;
  objectType: 'table' | 'view' | 'procedure' | 'job';
  objectName: string;
  dependencyType: 'direct' | 'transitive';
  description: string;
}

// --- ETL job (mock) ---
interface EtlJob {
  id: string;
  name: string;
  sourceTables: string[];
  targetTable: string;
  type: 'extract' | 'transform' | 'load' | 'full';
  lastRun?: string;
  status: 'ok' | 'warning' | 'error';
}

// Mock lineage for selected table/column
function buildMockLineage(
  tableName: string,
  columnName: string | null,
  tables: DatabaseTable[]
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const tableNames = tables.map((t) => t.name);
  // Center: selected table/column
  nodes.push({
    id: 'center',
    label: columnName ? `${tableName}.${columnName}` : tableName,
    type: columnName ? 'column' : 'table',
    table: tableName,
    column: columnName ?? undefined,
  });
  // Upstream: 1–2 "source" tables (mock)
  const upstream = tableNames.filter((t) => t !== tableName).slice(0, 2);
  upstream.forEach((t, i) => {
    const id = `up-${i}`;
    nodes.push({ id, label: t, type: 'table', table: t });
    edges.push({ fromId: id, toId: 'center', label: 'feeds' });
  });
  // Downstream: 1–2 "consumer" tables/views (mock)
  const downstream = tableNames.filter((t) => t !== tableName && !upstream.includes(t)).slice(0, 2);
  downstream.forEach((t, i) => {
    const id = `down-${i}`;
    nodes.push({ id, label: t, type: 'table', table: t });
    edges.push({ fromId: 'center', toId: id, label: 'feeds' });
  });
  return { nodes, edges };
}

// Mock impact list for selected object
function buildMockImpact(tableName: string, tables: DatabaseTable[]): ImpactItem[] {
  const others = tables.filter((t) => t.name !== tableName).slice(0, 4);
  return [
    { id: '1', objectType: 'view', objectName: `v_${tableName}_summary`, dependencyType: 'direct', description: 'View reads from this table' },
    ...others.slice(0, 2).map((t, i) => ({
      id: `t-${i}`,
      objectType: 'table' as const,
      objectName: t.name,
      dependencyType: 'direct' as const,
      description: 'Foreign key or ETL target',
    })),
    { id: '3', objectType: 'procedure', objectName: 'sp_refresh_report', dependencyType: 'transitive', description: 'Stored procedure uses dependent view' },
  ];
}

// Mock ETL jobs
function buildMockEtlJobs(tables: DatabaseTable[]): EtlJob[] {
  const names = tables.map((t) => t.name).slice(0, 5);
  if (names.length < 2) {
    return [
      { id: '1', name: 'Daily Load', sourceTables: ['external_source'], targetTable: names[0] || 'staging', type: 'full', lastRun: '2025-02-02 06:00', status: 'ok' },
    ];
  }
  return [
    { id: '1', name: 'Staging Load', sourceTables: [names[0]], targetTable: names[1] || 'core', type: 'load', lastRun: '2025-02-02 06:00', status: 'ok' },
    { id: '2', name: 'Aggregation Job', sourceTables: names.slice(0, 2), targetTable: names[2] || 'reporting', type: 'transform', lastRun: '2025-02-02 07:00', status: 'ok' },
    { id: '3', name: 'Archive Sync', sourceTables: [names[0]], targetTable: 'archive', type: 'extract', lastRun: '2025-02-01 23:00', status: 'warning' },
  ];
}

export function DataLineagePage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    loadDatabaseSchema,
    setActiveTab,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [activeTab, setActiveTabLocal] = useState<'lineage' | 'impact' | 'etl'>('lineage');

  // Lineage: selected table/column
  const [lineageTable, setLineageTable] = useState<string>('');
  const [lineageColumn, setLineageColumn] = useState<string>('');
  const [lineageLoading, setLineageLoading] = useState(false);

  // Impact: selected object for impact analysis
  const [impactObject, setImpactObject] = useState<string>('');
  const [impactLoading, setImpactLoading] = useState(false);

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
    if (!selectedServerId || !selectedDatabase) return;
    setLoadingSchema(true);
    loadDatabaseSchema(selectedServerId, selectedDatabase).finally(() => setLoadingSchema(false));
  }, [selectedServerId, selectedDatabase, loadDatabaseSchema]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const selectedDbSchema = useMemo(() => {
    if (!selectedDatabase || !selectedServerId) return null;
    return databases.find((d) => d.name === selectedDatabase) ?? null;
  }, [selectedServerId, selectedDatabase, databases]);

  const tables: DatabaseTable[] = selectedDbSchema?.tables ?? [];
  const tableColumnsMap = useMemo(() => {
    const m = new Map<string, TableColumn[]>();
    for (const t of tables) {
      m.set(t.name, t.columns ?? []);
    }
    return m;
  }, [tables]);

  const columnsForTable = (tableName: string): TableColumn[] => tableColumnsMap.get(tableName) ?? [];
  const lineageColumns = lineageTable ? columnsForTable(lineageTable) : [];

  const { nodes: lineageNodes, edges: lineageEdges } = useMemo(() => {
    if (!lineageTable || !tables.length) return { nodes: [], edges: [] };
    return buildMockLineage(lineageTable, lineageColumn || null, tables);
  }, [lineageTable, lineageColumn, tables]);

  const impactItems = useMemo(() => {
    const obj = impactObject || lineageTable || (tables[0]?.name ?? '');
    if (!obj || !tables.length) return [];
    return buildMockImpact(obj, tables);
  }, [impactObject, lineageTable, tables]);

  const etlJobs = useMemo(() => buildMockEtlJobs(tables), [tables]);

  const handleTraceLineage = () => {
    if (!lineageTable) {
      toast({ title: 'Select a table', description: 'Choose a table to trace lineage.', variant: 'destructive' });
      return;
    }
    setLineageLoading(true);
    setTimeout(() => {
      setLineageLoading(false);
      toast({ title: 'Lineage loaded', description: 'Upstream and downstream flow shown. Backend integration pending.' });
    }, 800);
  };

  const handleRunImpactAnalysis = () => {
    const obj = impactObject || lineageTable || tables[0]?.name;
    if (!obj) {
      toast({ title: 'Select an object', description: 'Choose a table or object for impact analysis.', variant: 'destructive' });
      return;
    }
    setImpactLoading(true);
    setTimeout(() => {
      setImpactLoading(false);
      toast({ title: 'Impact analysis complete', description: `${impactItems.length} dependent object(s) found.` });
    }, 600);
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <Network className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Data Lineage</h2>
            <p className="text-sm text-muted-foreground">
              Trace data flow: tables, columns, ETL. Impact analysis for changes.
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
              Add a database server to trace lineage and run impact analysis. Go to Servers to add your first connection.
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
        <div className="rounded-lg bg-cyan-500/10 p-2.5">
          <Network className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Data Lineage</h2>
          <p className="text-sm text-muted-foreground">
            Trace data flow: tables, columns, ETL. Impact analysis for changes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </CardTitle>
          <CardDescription>Select server and database to explore lineage and impact.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Server</Label>
            <Select
              value={selectedServerId ?? ''}
              onValueChange={(v) => setSelectedServerId(v || null)}
              disabled={loadingDatabases}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Database</Label>
            <Select
              value={selectedDatabase ?? ''}
              onValueChange={(v) => setSelectedDatabase(v || null)}
              disabled={!selectedServerId || loadingDatabases}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select database" />
              </SelectTrigger>
              <SelectContent>
                {databases.map((d) => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDatabase && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTabLocal(v as 'lineage' | 'impact' | 'etl')} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="lineage" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Lineage Explorer
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Impact Analysis
            </TabsTrigger>
            <TabsTrigger value="etl" className="gap-2">
              <Workflow className="h-4 w-4" />
              ETL Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lineage" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Trace data flow
                </CardTitle>
                <CardDescription>Select a table and optional column to see upstream and downstream lineage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Table</Label>
                    <Select value={lineageTable} onValueChange={(v) => { setLineageTable(v); setLineageColumn(''); }}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Column (optional)</Label>
                    <Select value={lineageColumn} onValueChange={setLineageColumn} disabled={!lineageTable}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All columns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All columns</SelectItem>
                        {lineageColumns.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleTraceLineage} disabled={!lineageTable || lineageLoading} className="gap-2">
                    {lineageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Trace lineage
                  </Button>
                </div>
                {(lineageNodes.length > 0 || lineageEdges.length > 0) && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                      <Network className="h-4 w-4 text-cyan-600" />
                      Data flow
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {lineageNodes.map((n, i) => (
                        <span key={n.id} className="flex items-center gap-1">
                          <Badge variant={n.id === 'center' ? 'default' : 'secondary'} className="font-mono text-xs">
                            {n.label}
                          </Badge>
                          {i < lineageNodes.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                      {lineageEdges.map((e) => {
                        const fromNode = lineageNodes.find((n) => n.id === e.fromId);
                        const toNode = lineageNodes.find((n) => n.id === e.toId);
                        return (
                          <div key={`${e.fromId}-${e.toId}`} className="flex items-center gap-2">
                            <ArrowDown className="h-3 w-3" />
                            <span className="font-mono">{fromNode?.label}</span>
                            <span>→ {e.label || 'feeds'}</span>
                            <span className="font-mono">{toNode?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {lineageTable && lineageNodes.length === 0 && !lineageLoading && (
                  <Alert>
                    <AlertDescription>Select a table and click &quot;Trace lineage&quot; to load flow. Backend lineage API can be wired here.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Impact analysis
                </CardTitle>
                <CardDescription>See what is affected if you change a table or object (views, procedures, jobs).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Object (table / view)</Label>
                    <Select value={impactObject || lineageTable || ''} onValueChange={setImpactObject}>
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select object" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleRunImpactAnalysis} disabled={impactLoading} className="gap-2">
                    {impactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Run impact analysis
                  </Button>
                </div>
                {impactItems.length > 0 && (
                  <ScrollArea className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Object</TableHead>
                          <TableHead>Dependency</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {impactItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{item.objectType}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.objectName}</TableCell>
                            <TableCell>
                              <Badge variant={item.dependencyType === 'direct' ? 'default' : 'secondary'}>
                                {item.dependencyType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{item.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="etl" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  ETL jobs and data flow
                </CardTitle>
                <CardDescription>Jobs that move or transform data between tables. Backend ETL metadata can be wired here.</CardDescription>
              </CardHeader>
              <CardContent>
                {etlJobs.length > 0 ? (
                  <ScrollArea className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Source(s)</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Last run</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {etlJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{job.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {job.sourceTables.join(', ') || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{job.targetTable}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{job.lastRun ?? '—'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={job.status === 'ok' ? 'default' : job.status === 'warning' ? 'secondary' : 'destructive'}
                              >
                                {job.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    <Table2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No ETL jobs defined for this database. Connect a scheduler or ETL catalog to list jobs.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedServerId && !selectedDatabase && (
        <Alert>
          <AlertDescription>Select a database to explore lineage, impact analysis, and ETL flow.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
