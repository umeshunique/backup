import { useEffect, useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { EnvironmentBadge } from '@/components/shared';
import { ServerConfig } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import {
  ArrowRight,
  Database,
  Loader2,
  Table2,
  GitCompare,
  FileCode2,
  Copy,
  Check,
  AlertCircle,
  Search,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ROW_LIMIT_DEFAULT = 500;
const ROW_LIMIT_OPTIONS = [100, 250, 500, 1000, 2500];

type DiffRowStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffRow {
  key: string;
  status: DiffRowStatus;
  sourceRow: Record<string, unknown> | null;
  targetRow: Record<string, unknown> | null;
}

function getRowKey(row: Record<string, unknown>, keyColumns: string[]): string {
  if (keyColumns.length > 0) {
    return keyColumns.map((c) => String(row[c] ?? '')).join('|');
  }
  return Object.values(row)
    .map((v) => String(v ?? ''))
    .join('|');
}

function buildDiff(
  sourceRows: Record<string, unknown>[],
  targetRows: Record<string, unknown>[],
  keyColumns: string[]
): DiffRow[] {
  const byKey = (rows: Record<string, unknown>[]) => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      map.set(getRowKey(row, keyColumns), row);
    }
    return map;
  };
  const sourceMap = byKey(sourceRows);
  const targetMap = byKey(targetRows);
  const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);
  const result: DiffRow[] = [];
  for (const key of allKeys) {
    const src = sourceMap.get(key) ?? null;
    const tgt = targetMap.get(key) ?? null;
    let status: DiffRowStatus = 'unchanged';
    if (!src) status = 'added';
    else if (!tgt) status = 'removed';
    else if (JSON.stringify(src) !== JSON.stringify(tgt)) status = 'modified';
    result.push({ key, status, sourceRow: src, targetRow: tgt });
  }
  return result.sort((a, b) => {
    const order: Record<DiffRowStatus, number> = {
      removed: 0,
      modified: 1,
      added: 2,
      unchanged: 3,
    };
    return order[a.status] - order[b.status];
  });
}

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const s = String(val);
  return "'" + s.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function generateSyncScript(
  diffRows: DiffRow[],
  tableName: string,
  direction: 'source-to-target' | 'target-to-source',
  allColumns: string[],
  keyColumns: string[]
): string {
  const lines: string[] = [];
  const quotedTable = '`' + tableName.replace(/`/g, '``') + '`';
  const pkCols = keyColumns.length > 0 ? keyColumns : allColumns.slice(0, 1);
  for (const dr of diffRows) {
    if (direction === 'source-to-target') {
      // Make target match source: INSERT rows only in source, UPDATE modified
      if (dr.status === 'removed' && dr.sourceRow) {
        const row = dr.sourceRow;
        const cols = allColumns.filter((c) => row[c] !== undefined);
        if (cols.length === 0) continue;
        const colList = cols.map((c) => '`' + c + '`').join(', ');
        const valList = cols.map((c) => escapeSql(row[c])).join(', ');
        lines.push(`INSERT INTO ${quotedTable} (${colList}) VALUES (${valList});`);
      } else if (dr.status === 'modified' && dr.sourceRow && dr.targetRow) {
        const row = dr.sourceRow;
        const sets = allColumns
          .filter((c) => row[c] !== undefined)
          .map((c) => '`' + c + '` = ' + escapeSql(row[c]));
        if (sets.length === 0) continue;
        const whereClause = pkCols.map((c) => '`' + c + '` = ' + escapeSql(dr.sourceRow![c])).join(' AND ');
        lines.push(`UPDATE ${quotedTable} SET ${sets.join(', ')} WHERE ${whereClause};`);
      }
    } else {
      // Make source match target: INSERT rows only in target, UPDATE modified
      if (dr.status === 'added' && dr.targetRow) {
        const row = dr.targetRow;
        const cols = allColumns.filter((c) => row[c] !== undefined);
        if (cols.length === 0) continue;
        const colList = cols.map((c) => '`' + c + '`').join(', ');
        const valList = cols.map((c) => escapeSql(row[c])).join(', ');
        lines.push(`INSERT INTO ${quotedTable} (${colList}) VALUES (${valList});`);
      } else if (dr.status === 'modified' && dr.sourceRow && dr.targetRow) {
        const row = dr.targetRow;
        const sets = allColumns
          .filter((c) => row[c] !== undefined)
          .map((c) => '`' + c + '` = ' + escapeSql(row[c]));
        if (sets.length === 0) continue;
        const whereClause = pkCols.map((c) => '`' + c + '` = ' + escapeSql(dr.targetRow![c])).join(' AND ');
        lines.push(`UPDATE ${quotedTable} SET ${sets.join(', ')} WHERE ${whereClause};`);
      }
    }
  }
  return lines.join('\n');
}

export function DataComparePage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    loadDatabaseSchema,
    getDatabasesForServer,
    getServerById,
    setActiveTab,
  } = useBackupStore();

  const [sourceServerId, setSourceServerId] = useState<string | null>(null);
  const [sourceDatabase, setSourceDatabase] = useState<string | null>(null);
  const [sourceTable, setSourceTable] = useState<string | null>(null);
  const [targetServerId, setTargetServerId] = useState<string | null>(null);
  const [targetDatabase, setTargetDatabase] = useState<string | null>(null);
  const [targetTable, setTargetTable] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState(ROW_LIMIT_DEFAULT);
  const [syncDirection, setSyncDirection] = useState<'source-to-target' | 'target-to-source'>(
    'source-to-target'
  );
  const [diffView, setDiffView] = useState<'side-by-side' | 'unified'>('side-by-side');

  const [loadingSourceDb, setLoadingSourceDb] = useState(false);
  const [loadingTargetDb, setLoadingTargetDb] = useState(false);
  const [loadingSourceSchema, setLoadingSourceSchema] = useState(false);
  const [loadingTargetSchema, setLoadingTargetSchema] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [sourceData, setSourceData] = useState<Record<string, unknown>[] | null>(null);
  const [targetData, setTargetData] = useState<Record<string, unknown>[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptCopied, setScriptCopied] = useState(false);
  const [sourceTableSearch, setSourceTableSearch] = useState('');
  const [targetTableSearch, setTargetTableSearch] = useState('');

  const sourceDatabases = sourceServerId ? getDatabasesForServer(sourceServerId) : [];
  const targetDatabases = targetServerId ? getDatabasesForServer(targetServerId) : [];
  const sourceServer = sourceServerId ? getServerById(sourceServerId) : undefined;
  const targetServer = targetServerId ? getServerById(targetServerId) : undefined;

  const sourceSchema = sourceServerId && sourceDatabase
    ? (getDatabasesForServer(sourceServerId).find((d) => d.name === sourceDatabase) ?? null)
    : null;
  const targetSchema = targetServerId && targetDatabase
    ? (getDatabasesForServer(targetServerId).find((d) => d.name === targetDatabase) ?? null)
    : null;

  const sourceTableList = sourceSchema?.tables ?? [];
  const targetTableList = targetSchema?.tables ?? [];

  const filteredSourceTables = useMemo(() => {
    const q = sourceTableSearch.trim().toLowerCase();
    if (!q) return sourceTableList;
    return sourceTableList.filter((t) => t.name.toLowerCase().includes(q));
  }, [sourceTableList, sourceTableSearch]);

  const filteredTargetTables = useMemo(() => {
    const q = targetTableSearch.trim().toLowerCase();
    if (!q) return targetTableList;
    return targetTableList.filter((t) => t.name.toLowerCase().includes(q));
  }, [targetTableList, targetTableSearch]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!sourceServerId) {
      setSourceDatabase(null);
      setSourceTable(null);
      return;
    }
    setSourceDatabase(null);
    setSourceTable(null);
    setLoadingSourceDb(true);
    loadDatabasesForServer(sourceServerId).finally(() => setLoadingSourceDb(false));
  }, [sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (!targetServerId) {
      setTargetDatabase(null);
      setTargetTable(null);
      return;
    }
    setTargetDatabase(null);
    setTargetTable(null);
    setLoadingTargetDb(true);
    loadDatabasesForServer(targetServerId).finally(() => setLoadingTargetDb(false));
  }, [targetServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (!sourceServerId || !sourceDatabase) return;
    setSourceTable(null);
    setLoadingSourceSchema(true);
    loadDatabaseSchema(sourceServerId, sourceDatabase).finally(() => setLoadingSourceSchema(false));
  }, [sourceServerId, sourceDatabase, loadDatabaseSchema]);

  useEffect(() => {
    if (!targetServerId || !targetDatabase) return;
    setTargetTable(null);
    setLoadingTargetSchema(true);
    loadDatabaseSchema(targetServerId, targetDatabase).finally(() => setLoadingTargetSchema(false));
  }, [targetServerId, targetDatabase, loadDatabaseSchema]);

  const keyColumns = useMemo(() => {
    const schema = syncDirection === 'source-to-target' ? sourceSchema : targetSchema;
    const tableName = syncDirection === 'source-to-target' ? sourceTable : targetTable;
    const table = schema?.tables?.find((t) => t.name === tableName);
    const pk = table?.columns?.filter((c) => c.isPrimaryKey).map((c) => c.name) ?? [];
    if (pk.length > 0) return pk;
    return table?.columns?.map((c) => c.name).slice(0, 1) ?? [];
  }, [sourceSchema, targetSchema, sourceTable, targetTable, syncDirection]);

  const allColumns = useMemo(() => {
    const schema = syncDirection === 'source-to-target' ? sourceSchema : targetSchema;
    const tableName = syncDirection === 'source-to-target' ? sourceTable : targetTable;
    const table = schema?.tables?.find((t) => t.name === tableName);
    return table?.columns?.map((c) => c.name) ?? [];
  }, [sourceSchema, targetSchema, sourceTable, targetTable, syncDirection]);

  const diffRows = useMemo((): DiffRow[] => {
    if (!sourceData || !targetData || allColumns.length === 0) return [];
    return buildDiff(sourceData, targetData, keyColumns.length > 0 ? keyColumns : allColumns);
  }, [sourceData, targetData, keyColumns, allColumns]);

  const stats = useMemo(() => {
    let added = 0,
      removed = 0,
      modified = 0,
      unchanged = 0;
    for (const r of diffRows) {
      if (r.status === 'added') added++;
      else if (r.status === 'removed') removed++;
      else if (r.status === 'modified') modified++;
      else unchanged++;
    }
    return { added, removed, modified, unchanged };
  }, [diffRows]);

  const runCompare = async () => {
    if (!sourceServer || !targetServer || !sourceDatabase || !targetDatabase || !sourceTable || !targetTable) {
      toast({ title: 'Selection required', description: 'Choose source and target server, database, and table.', variant: 'destructive' });
      return;
    }
    setCompareError(null);
    setComparing(true);
    try {
      const [sourceRes, targetRes] = await Promise.all([
        apiClient.executeQuery({
          host: sourceServer.host,
          port: sourceServer.port,
          user: sourceServer.username,
          password: sourceServer.password,
          type: sourceServer.databaseType,
          database: sourceDatabase,
          query: `SELECT * FROM \`${sourceTable}\` LIMIT ${rowLimit}`,
        }),
        apiClient.executeQuery({
          host: targetServer.host,
          port: targetServer.port,
          user: targetServer.username,
          password: targetServer.password,
          type: targetServer.databaseType,
          database: targetDatabase,
          query: `SELECT * FROM \`${targetTable}\` LIMIT ${rowLimit}`,
        }),
      ]);
      if (!sourceRes.success || sourceRes.rows == null) {
        setCompareError(sourceRes.error ?? 'Failed to load source data');
        setSourceData(null);
        setTargetData(null);
        return;
      }
      if (!targetRes.success || targetRes.rows == null) {
        setCompareError(targetRes.error ?? 'Failed to load target data');
        setSourceData(null);
        setTargetData(null);
        return;
      }
      setSourceData(sourceRes.rows as Record<string, unknown>[]);
      setTargetData(targetRes.rows as Record<string, unknown>[]);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : 'Compare failed');
      setSourceData(null);
      setTargetData(null);
    } finally {
      setComparing(false);
    }
  };

  const handleGenerateScript = () => {
    const tableName = syncDirection === 'source-to-target' ? targetTable! : sourceTable!;
    const script = generateSyncScript(diffRows, tableName, syncDirection, allColumns, keyColumns);
    setGeneratedScript(script);
  };

  const copyScript = async () => {
    if (!generatedScript) return;
    await navigator.clipboard.writeText(generatedScript);
    setScriptCopied(true);
    toast({ title: 'Copied', description: 'SQL script copied to clipboard.' });
    setTimeout(() => setScriptCopied(false), 2000);
  };

  const isSameEndpoint =
    sourceServerId &&
    targetServerId &&
    sourceDatabase &&
    targetDatabase &&
    sourceTable &&
    targetTable &&
    sourceServerId === targetServerId &&
    sourceDatabase === targetDatabase &&
    sourceTable === targetTable;

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <GitCompare className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Data Compare</h2>
            <p className="text-sm text-muted-foreground">
              Compare table data between source and target. Diff view, sync direction, and generate INSERT/UPDATE.
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">Add a database server to use Data Compare.</p>
            <Button onClick={() => setActiveTab('servers')}>Go to Servers</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2.5">
          <GitCompare className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Data Compare</h2>
          <p className="text-sm text-muted-foreground">
            Compare table data between source and target. Diff view, sync direction, and generate INSERT/UPDATE.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
        <Card className="border-2 border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Database className="h-4 w-4" />
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Server</Label>
              <Select
                value={sourceServerId ?? ''}
                onValueChange={(v) => {
                  setSourceServerId(v || null);
                  setSourceDatabase(null);
                  setSourceTable(null);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select server" /></SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <EnvironmentBadge environment={s.environment} size="sm" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Database</Label>
              <Select
                value={sourceDatabase ?? ''}
                onValueChange={(v) => {
                  setSourceDatabase(v || null);
                  setSourceTable(null);
                  setSourceTableSearch('');
                }}
                disabled={!sourceServerId}
              >
                <SelectTrigger><SelectValue placeholder="Select database" /></SelectTrigger>
                <SelectContent>
                  {loadingSourceDb ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    sourceDatabases.map((db) => {
                      const isLoading = loadingSourceSchema && db.name === sourceDatabase;
                      const tableCount = db.tables?.length ?? db.tableCount ?? 0;
                      return (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                          <span className="text-muted-foreground ml-1">
                            {isLoading ? '(loading…)' : `(${tableCount} table${tableCount === 1 ? '' : 's'})`}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Table</Label>
              {sourceTableList.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search tables…"
                    value={sourceTableSearch}
                    onChange={(e) => setSourceTableSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    disabled={!sourceDatabase || loadingSourceSchema}
                  />
                </div>
              )}
              <Select
                value={sourceTable ?? ''}
                onValueChange={(v) => setSourceTable(v || null)}
                disabled={!sourceDatabase || loadingSourceSchema}
              >
                <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                <SelectContent>
                  {loadingSourceSchema ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading tables…
                    </div>
                  ) : sourceTableList.length === 0 ? (
                    <div className="p-2 text-muted-foreground text-sm">
                      {sourceDatabase ? 'No tables in this database' : 'Select a database first'}
                    </div>
                  ) : filteredSourceTables.length === 0 ? (
                    <div className="p-2 text-muted-foreground text-sm">
                      No tables match &quot;{sourceTableSearch}&quot;
                    </div>
                  ) : (
                    filteredSourceTables.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        <span className="flex items-center gap-2">
                          <Table2 className="h-3.5 w-3.5" />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="hidden lg:flex items-center justify-center pt-10">
          <ArrowRight className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>

        <Card className="border-2 border-violet-500/20 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <Database className="h-4 w-4" />
              Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Server</Label>
              <Select
                value={targetServerId ?? ''}
                onValueChange={(v) => {
                  setTargetServerId(v || null);
                  setTargetDatabase(null);
                  setTargetTable(null);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select server" /></SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <EnvironmentBadge environment={s.environment} size="sm" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Database</Label>
              <Select
                value={targetDatabase ?? ''}
                onValueChange={(v) => {
                  setTargetDatabase(v || null);
                  setTargetTable(null);
                  setTargetTableSearch('');
                }}
                disabled={!targetServerId}
              >
                <SelectTrigger><SelectValue placeholder="Select database" /></SelectTrigger>
                <SelectContent>
                  {loadingTargetDb ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    targetDatabases.map((db) => {
                      const isLoading = loadingTargetSchema && db.name === targetDatabase;
                      const tableCount = db.tables?.length ?? db.tableCount ?? 0;
                      return (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                          <span className="text-muted-foreground ml-1">
                            {isLoading ? '(loading…)' : `(${tableCount} table${tableCount === 1 ? '' : 's'})`}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Table</Label>
              {targetTableList.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search tables…"
                    value={targetTableSearch}
                    onChange={(e) => setTargetTableSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    disabled={!targetDatabase || loadingTargetSchema}
                  />
                </div>
              )}
              <Select
                value={targetTable ?? ''}
                onValueChange={(v) => setTargetTable(v || null)}
                disabled={!targetDatabase || loadingTargetSchema}
              >
                <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                <SelectContent>
                  {loadingTargetSchema ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading tables…
                    </div>
                  ) : targetTableList.length === 0 ? (
                    <div className="p-2 text-muted-foreground text-sm">
                      {targetDatabase ? 'No tables in this database' : 'Select a database first'}
                    </div>
                  ) : filteredTargetTables.length === 0 ? (
                    <div className="p-2 text-muted-foreground text-sm">
                      No tables match &quot;{targetTableSearch}&quot;
                    </div>
                  ) : (
                    filteredTargetTables.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        <span className="flex items-center gap-2">
                          <Table2 className="h-3.5 w-3.5" />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {isSameEndpoint && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Source and target are the same. Choose different server, database, or table to compare.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <Label className="text-sm">Row limit</Label>
            <Select
              value={String(rowLimit)}
              onValueChange={(v) => setRowLimit(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROW_LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Sync direction</Label>
            <RadioGroup
              value={syncDirection}
              onValueChange={(v) => setSyncDirection(v as 'source-to-target' | 'target-to-source')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="source-to-target" id="dir-source-target" />
                <Label htmlFor="dir-source-target" className="font-normal cursor-pointer">
                  Source → Target
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="target-to-source" id="dir-target-source" />
                <Label htmlFor="dir-target-source" className="font-normal cursor-pointer">
                  Target → Source
                </Label>
              </div>
            </RadioGroup>
          </div>
          <Button
            onClick={runCompare}
            disabled={
              comparing ||
              !sourceServer ||
              !targetServer ||
              !sourceDatabase ||
              !targetDatabase ||
              !sourceTable ||
              !targetTable ||
              isSameEndpoint
            }
            className="gap-2"
          >
            {comparing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="h-4 w-4" />
            )}
            Compare data
          </Button>
        </CardContent>
      </Card>

      {compareError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {compareError}
        </div>
      )}

      {diffRows.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">Diff view</CardTitle>
              <Tabs value={diffView} onValueChange={(v) => setDiffView(v as 'side-by-side' | 'unified')}>
                <TabsList className="h-9">
                  <TabsTrigger value="side-by-side" className="text-xs">Side by side</TabsTrigger>
                  <TabsTrigger value="unified" className="text-xs">Unified</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-red-500/40" /> Removed ({stats.removed})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-amber-500/40" /> Modified ({stats.modified})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-500/40" /> Added ({stats.added})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-muted" /> Unchanged ({stats.unchanged})
                </span>
              </div>
              <ScrollArea className="border rounded-md">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8 text-muted-foreground">#</TableHead>
                        <TableHead className="w-24 text-muted-foreground">Status</TableHead>
                        {diffView === 'side-by-side' ? (
                          <>
                            <TableHead className="text-blue-600 dark:text-blue-400">Source</TableHead>
                            <TableHead className="text-violet-600 dark:text-violet-400">Target</TableHead>
                          </>
                        ) : (
                          <TableHead>Value</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diffRows.slice(0, 200).map((dr, i) => {
                        const bg =
                          dr.status === 'added'
                            ? 'bg-emerald-500/10'
                            : dr.status === 'removed'
                              ? 'bg-red-500/10'
                              : dr.status === 'modified'
                                ? 'bg-amber-500/10'
                                : '';
                        return (
                          <TableRow key={dr.key} className={bg}>
                            <TableCell className="text-muted-foreground font-mono text-xs">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  dr.status === 'added'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : dr.status === 'removed'
                                      ? 'text-red-600 dark:text-red-400'
                                      : dr.status === 'modified'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-muted-foreground'
                                }
                              >
                                {dr.status}
                              </span>
                            </TableCell>
                            {diffView === 'side-by-side' ? (
                              <>
                                <TableCell className="max-w-[300px] truncate font-mono text-xs">
                                  {dr.sourceRow
                                    ? allColumns.map((c) => `${c}=${String(dr.sourceRow![c] ?? '')}`).join(', ')
                                    : '—'}
                                </TableCell>
                                <TableCell className="max-w-[300px] truncate font-mono text-xs">
                                  {dr.targetRow
                                    ? allColumns.map((c) => `${c}=${String(dr.targetRow![c] ?? '')}`).join(', ')
                                    : '—'}
                                </TableCell>
                              </>
                            ) : (
                              <TableCell className="font-mono text-xs">
                                {dr.sourceRow && JSON.stringify(dr.sourceRow)}
                                {dr.targetRow && !dr.sourceRow && JSON.stringify(dr.targetRow)}
                                {dr.sourceRow && dr.targetRow && dr.status === 'modified' && (
                                  <span className="text-muted-foreground">
                                    {' → '}
                                    {JSON.stringify(dr.targetRow)}
                                  </span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              {diffRows.length > 200 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing first 200 of {diffRows.length} rows. Generate script for full sync.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode2 className="h-4 w-4" />
                Generate INSERT / UPDATE
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateScript} className="gap-1.5">
                  Generate script
                </Button>
                {generatedScript && (
                  <Button variant="outline" size="sm" onClick={copyScript} className="gap-1.5">
                    {scriptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedScript ? (
                <pre className="p-4 rounded-md bg-muted/50 text-xs font-mono overflow-x-auto max-h-[320px] overflow-y-auto whitespace-pre-wrap break-all">
                  {generatedScript}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click &quot;Generate script&quot; to create INSERT/UPDATE statements for the selected sync direction.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
