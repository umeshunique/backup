import { useState, useEffect, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import type { ServerConfig } from '@/types/backup.types';
import type { DatabaseTable, TableColumn } from '@/types/backup.types';
import {
  DEFAULT_OPTIONS,
  inferColumnGenerator,
  getTablesInFkOrder,
  type ColumnGeneratorConfig,
  type TableGeneratorConfig,
  type DataGeneratorOptions,
} from './types';
import { generateValue, sqlEscape } from './generators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Server as ServerIcon,
  Table2,
  Settings2,
  Play,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Link2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TEMPLATE_OPTIONS, PATTERN_PRESETS } from './types';

interface DataGeneratorProps {
  server: ServerConfig;
  database: string;
  onNoServers?: () => void;
}

export function DataGenerator({ server, database, onNoServers }: DataGeneratorProps) {
  const { loadDatabaseSchema, getDatabasesForServer } = useBackupStore();
  const [schema, setSchema] = useState<{ tables: DatabaseTable[] } | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [tableConfigs, setTableConfigs] = useState<Record<string, TableGeneratorConfig>>({});
  const [options, setOptions] = useState<DataGeneratorOptions>(DEFAULT_OPTIONS);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('tables');
  const [previewRows, setPreviewRows] = useState<Record<string, unknown[][]>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0, table: '' });

  const databases = getDatabasesForServer(server.id) ?? [];
  const tables = schema?.tables ?? [];
  const sortedTables = useMemo(() => getTablesInFkOrder(tables), [tables]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSchema(true);
    loadDatabaseSchema(server.id, database)
      .then(() => {
        if (cancelled) return;
        const schemas = getDatabasesForServer(server.id);
        const dbSchema = schemas.find((s) => s.name === database);
        return dbSchema ? { tables: dbSchema.tables ?? [] } : { tables: [] };
      })
      .then((res) => {
        if (cancelled) return;
        setSchema(res ?? { tables: [] });
      })
      .catch(() => {
        if (!cancelled) setSchema({ tables: [] });
      })
      .finally(() => {
        if (!cancelled) setLoadingSchema(false);
      });
    return () => {
      cancelled = true;
    };
  }, [server.id, database, loadDatabaseSchema, getDatabasesForServer]);

  const toggleTable = (name: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        setTableConfigs((c) => {
          const { [name]: _, ...rest } = c;
          return rest;
        });
      } else {
        next.add(name);
        const table = tables.find((t) => t.name === name);
        if (table?.columns?.length) {
          const columns: Record<string, ColumnGeneratorConfig> = {};
          for (const col of table.columns) {
            columns[col.name] = inferColumnGenerator(col);
          }
          setTableConfigs((c) => ({
            ...c,
            [name]: {
              tableName: name,
              rowCount: 100,
              columns,
            },
          }));
        }
      }
      return next;
    });
  };

  const setTableRowCount = (tableName: string, rowCount: number) => {
    setTableConfigs((c) => {
      const cur = c[tableName];
      if (!cur) return c;
      return { ...c, [tableName]: { ...cur, rowCount: Math.max(0, rowCount) } };
    });
  };

  const setColumnConfig = (tableName: string, columnName: string, config: ColumnGeneratorConfig) => {
    setTableConfigs((c) => {
      const cur = c[tableName];
      if (!cur) return c;
      return {
        ...c,
        [tableName]: {
          ...cur,
          columns: { ...cur.columns, [columnName]: config },
        },
      };
    });
  };

  const toggleExpanded = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const generatePreview = () => {
    const out: Record<string, unknown[][]> = {};
    const tablesToGen = options.respectFkOrder
      ? sortedTables.filter((t) => selectedTables.has(t.name))
      : [...tables].filter((t) => selectedTables.has(t.name));
    for (const table of tablesToGen) {
      const cfg = tableConfigs[table.name];
      if (!cfg || !table.columns?.length) continue;
      const cols = table.columns.filter((c) => {
        const g = cfg.columns[c.name];
        return g && g.mode !== 'skip';
      });
      const rows: unknown[][] = [];
      for (let r = 0; r < 3; r++) {
        const row: unknown[] = [];
        for (const col of table.columns) {
          const g = cfg.columns[col.name];
          if (!g || g.mode === 'skip') {
            row.push(null);
            continue;
          }
          row.push(generateValue(col, g, r));
        }
        rows.push(row);
      }
      out[table.name] = rows;
    }
    setPreviewRows(out);
    setActiveTab('preview');
  };

  const runGeneration = async () => {
    const tablesToGen = options.respectFkOrder
      ? sortedTables.filter((t) => selectedTables.has(t.name))
      : [...tables].filter((t) => selectedTables.has(t.name));
    if (tablesToGen.length === 0) {
      toast({ title: 'No tables selected', variant: 'destructive' });
      return;
    }
    setIsRunning(true);
    const totalBatches = tablesToGen.reduce((acc, t) => {
      const cfg = tableConfigs[t.name];
      if (!cfg) return acc;
      const batches = Math.ceil(cfg.rowCount / options.batchSize) || 1;
      return acc + batches;
    }, 0);
    let done = 0;
    setRunProgress({ current: 0, total: totalBatches, table: '' });

    const conn = {
      host: server.host,
      port: server.port,
      user: server.username,
      password: server.password,
      type: server.databaseType,
      database,
    };
    try {
      if (options.useTransaction) {
        await apiClient.executeQuery({
          ...conn,
          query: 'START TRANSACTION',
        });
      }

      for (const table of tablesToGen) {
        const cfg = tableConfigs[table.name];
        if (!cfg || !table.columns?.length) continue;
        setRunProgress((p) => ({ ...p, table: table.name }));
        const cols = table.columns.filter((c) => {
          const g = cfg.columns[c.name];
          return g && g.mode !== 'skip';
        });
        const colNames = cols.map((c) => c.name);
        const totalRows = cfg.rowCount;
        let inserted = 0;
        while (inserted < totalRows) {
          const batchSize = Math.min(options.batchSize, totalRows - inserted);
          const values: string[] = [];
          for (let r = 0; r < batchSize; r++) {
            const rowNum = inserted + r;
            const rowVals = table.columns.map((col) => {
              const g = cfg.columns[col.name];
              if (!g || g.mode === 'skip') return 'NULL';
              return sqlEscape(generateValue(col, g, rowNum));
            });
            values.push(`(${rowVals.join(', ')})`);
          }
          const sql = `INSERT INTO \`${table.name}\` (${table.columns!.map((c) => `\`${c.name}\``).join(', ')}) VALUES ${values.join(', ')}`;
          const res = await apiClient.executeQuery({ ...conn, query: sql });
          if (!res.success && res.error) throw new Error(res.error);
          inserted += batchSize;
          done += 1;
          setRunProgress({ current: done, total: totalBatches, table: table.name });
        }
      }

      if (options.useTransaction) {
        await apiClient.executeQuery({ ...conn, query: 'COMMIT' });
      }
      toast({ title: 'Data generated successfully', description: `${done} batch(es) inserted.` });
      setActiveTab('tables');
    } catch (e: unknown) {
      if (options.useTransaction) {
        try {
          await apiClient.executeQuery({ ...conn, query: 'ROLLBACK' });
        } catch {}
      }
      toast({
        title: 'Generation failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (loadingSchema) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tables.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          No tables found in this database, or schema could not be loaded.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="columns">Column config</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="preview">Preview & Run</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Select tables and row counts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose tables to fill with test data. Row count is per table.
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Table</TableHead>
                      <TableHead>Rows to generate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(options.respectFkOrder ? sortedTables : tables).map((t) => (
                      <TableRow key={t.name}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTables.has(t.name)}
                            onCheckedChange={() => toggleTable(t.name)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{t.name}</TableCell>
                        <TableCell>
                          {selectedTables.has(t.name) ? (
                            <Input
                              type="number"
                              min={1}
                              max={1000000}
                              value={tableConfigs[t.name]?.rowCount ?? 100}
                              onChange={(e) =>
                                setTableRowCount(t.name, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-28"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {selectedTables.size > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedTables.size} table(s) selected. Configure columns in the next tab.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Column generators</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set generation mode per column: random, pattern, or template. Skip auto-increment or columns you don&apos;t need.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {(options.respectFkOrder ? sortedTables : tables)
                .filter((t) => selectedTables.has(t.name))
                .map((table) => {
                  const cfg = tableConfigs[table.name];
                  const expanded = expandedTables.has(table.name);
                  const cols = table.columns ?? [];
                  return (
                    <div key={table.name} className="rounded-lg border bg-muted/30 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 p-3 text-left font-medium hover:bg-muted/50"
                        onClick={() => toggleExpanded(table.name)}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-mono">{table.name}</span>
                        <Badge variant="secondary">{cols.length} columns</Badge>
                      </button>
                      {expanded && cfg && (
                        <div className="border-t p-3 space-y-3">
                          {cols.map((col) => (
                            <ColumnConfigRow
                              key={col.name}
                              col={col}
                              config={cfg.columns[col.name] ?? { mode: 'skip' }}
                              onChange={(config) => setColumnConfig(table.name, col.name, config)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              {selectedTables.size === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  Select tables in the Tables tab first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Insert options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fk-order"
                  checked={options.respectFkOrder}
                  onCheckedChange={(v) =>
                    setOptions((o) => ({ ...o, respectFkOrder: v === true }))
                  }
                />
                <Label htmlFor="fk-order" className="flex items-center gap-2 cursor-pointer">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Respect foreign key order (parent tables first)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tx"
                  checked={options.useTransaction}
                  onCheckedChange={(v) =>
                    setOptions((o) => ({ ...o, useTransaction: v === true }))
                  }
                />
                <Label htmlFor="tx" className="cursor-pointer">
                  Use transaction (rollback on error)
                </Label>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Batch size (rows per INSERT)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={options.batchSize}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      batchSize: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Preview & Run
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sample rows below. Click Generate preview to refresh, then Run to insert.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(previewRows).length === 0 ? (
                <div className="py-8 text-center">
                  <Button onClick={generatePreview} variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate preview
                  </Button>
                </div>
              ) : (
                <>
                  {Object.entries(previewRows).map(([tableName, rows]) => (
                    <div key={tableName}>
                      <p className="font-mono text-sm font-medium mb-2">{tableName}</p>
                      <ScrollArea className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {rows[0]?.map((_, i) => (
                                <TableHead key={i}>Col {i + 1}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, ri) => (
                              <TableRow key={ri}>
                                {row.map((v, i) => (
                                  <TableCell key={i} className="font-mono text-xs max-w-[200px] truncate">
                                    {v == null ? 'NULL' : String(v)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={generatePreview} variant="outline" size="sm" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Refresh preview
                    </Button>
                    <Button
                      onClick={runGeneration}
                      disabled={isRunning || selectedTables.size === 0}
                      className="gap-2"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Inserting…
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Run bulk insert
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
              {isRunning && (
                <div className="space-y-2">
                  <Progress value={(runProgress.current / runProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground">
                    {runProgress.table} — batch {runProgress.current} / {runProgress.total}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColumnConfigRow({
  col,
  config,
  onChange,
}: {
  col: TableColumn;
  config: ColumnGeneratorConfig;
  onChange: (c: ColumnGeneratorConfig) => void;
}) {
  const [patternCustom, setPatternCustom] = useState(
    config.mode === 'pattern' ? config.config.format : ''
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-sm border-b pb-2 last:border-0">
      <div className="sm:col-span-3 font-mono text-muted-foreground">{col.name}</div>
      <div className="sm:col-span-2">
        <Select
          value={config.mode}
          onValueChange={(v: ColumnGeneratorConfig['mode']) => {
            if (v === 'skip') onChange({ mode: 'skip' });
            if (v === 'random') onChange({ mode: 'random', config: {} });
            if (v === 'pattern') onChange({ mode: 'pattern', config: { format: 'email' } });
            if (v === 'template') onChange({ mode: 'template', config: { template: 'name' } });
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Skip</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="pattern">Pattern</SelectItem>
            <SelectItem value="template">Template</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-7 flex flex-wrap gap-2 items-center">
        {config.mode === 'random' && (
          <>
            {(col.dataType || '').toLowerCase().match(/int|decimal|numeric/) && (
              <>
                <Input
                  type="number"
                  placeholder="Min"
                  className="w-20 h-8"
                  value={config.config?.min ?? ''}
                  onChange={(e) =>
                    onChange({
                      mode: 'random',
                      config: { ...config.config, min: parseInt(e.target.value, 10) || undefined },
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="w-20 h-8"
                  value={config.config?.max ?? ''}
                  onChange={(e) =>
                    onChange({
                      mode: 'random',
                      config: { ...config.config, max: parseInt(e.target.value, 10) || undefined },
                    })
                  }
                />
              </>
            )}
            {((col.dataType || '').toLowerCase().match(/char|text|varchar/) || !col.dataType) && (
              <Input
                type="number"
                placeholder="Length"
                className="w-20 h-8"
                value={config.config?.length ?? ''}
                onChange={(e) =>
                  onChange({
                    mode: 'random',
                    config: { ...config.config, length: parseInt(e.target.value, 10) || undefined },
                  })
                }
              />
            )}
          </>
        )}
        {config.mode === 'pattern' && (
          <Select
            value={
              ['email', 'phone', 'uuid', 'zip'].includes(config.config?.format || '')
                ? config.config?.format
                : 'custom'
            }
            onValueChange={(v) => {
              if (v === 'custom') {
                onChange({ mode: 'pattern', config: { format: patternCustom || 'USER-{id}' } });
              } else {
                onChange({ mode: 'pattern', config: { format: v } });
              }
            }}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATTERN_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {config.mode === 'template' && (
          <Select
            value={config.config?.template ?? 'name'}
            onValueChange={(t) =>
              onChange({ mode: 'template', config: { template: t } })
            }
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
