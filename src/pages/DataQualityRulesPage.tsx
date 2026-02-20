/**
 * Data Quality Rules — Validation rules, duplicate detection, and referential integrity checks.
 * Full-feature UI with server/database context; backend APIs can be wired later.
 */

import { useEffect, useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldCheck,
  Copy,
  Link2,
  Database,
  Server as ServerIcon,
  Plus,
  RefreshCw,
  Loader2,
  Play,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FlaskConical,
} from 'lucide-react';
import type { ServerConfig } from '@/types/backup.types';
import type { DatabaseTable, TableColumn } from '@/types/backup.types';
import { toast } from '@/hooks/use-toast';

// --- Validation rules (local state; persist via API later) ---
type ValidationRuleType = 'not_null' | 'unique' | 'range' | 'regex' | 'custom_sql';

interface ValidationRule {
  id: string;
  name: string;
  tableName: string;
  columnName: string;
  type: ValidationRuleType;
  expression: string;
  enabled: boolean;
}

const VALIDATION_TYPES: { value: ValidationRuleType; label: string }[] = [
  { value: 'not_null', label: 'Not null' },
  { value: 'unique', label: 'Unique' },
  { value: 'range', label: 'Range (min/max)' },
  { value: 'regex', label: 'Regex' },
  { value: 'custom_sql', label: 'Custom SQL' },
];

// --- Duplicate detection (mock results) ---
interface DuplicateGroup {
  keyValue: string;
  tableName: string;
  columnNames: string[];
  count: number;
  rowIds: string[];
}

// --- Referential integrity (mock results) ---
interface IntegrityIssue {
  type: 'orphan' | 'broken_fk';
  tableName: string;
  columnName?: string;
  referencedTable?: string;
  referencedColumn?: string;
  rowCount: number;
  message: string;
}

export function DataQualityRulesPage() {
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
  const [activeTab, setActiveTabLocal] = useState<'validation' | 'duplicates' | 'integrity'>('validation');

  // Validation rules (in-memory for now)
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTable, setNewRuleTable] = useState('');
  const [newRuleColumn, setNewRuleColumn] = useState('');
  const [newRuleType, setNewRuleType] = useState<ValidationRuleType>('not_null');
  const [newRuleExpression, setNewRuleExpression] = useState('');

  // Duplicate detection
  const [dupTable, setDupTable] = useState('');
  const [dupKeyColumns, setDupKeyColumns] = useState<string[]>([]);
  const [dupScanning, setDupScanning] = useState(false);
  const [dupResults, setDupResults] = useState<DuplicateGroup[]>([]);

  // Referential integrity
  const [integrityChecking, setIntegrityChecking] = useState(false);
  const [integrityResults, setIntegrityResults] = useState<IntegrityIssue[]>([]);

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

  const foreignKeys = useMemo(() => {
    const fks: { table: string; name: string; columns: string[]; refTable: string; refColumns: string[] }[] = [];
    for (const t of tables) {
      for (const c of t.constraints ?? []) {
        if (c.type === 'FOREIGN KEY' && c.referencedTable && c.referencedColumns?.length) {
          fks.push({
            table: t.name,
            name: c.name,
            columns: c.columns,
            refTable: c.referencedTable,
            refColumns: c.referencedColumns,
          });
        }
      }
    }
    return fks;
  }, [tables]);

  const columnsForTable = (tableName: string): TableColumn[] => tableColumnsMap.get(tableName) ?? [];

  const handleAddValidationRule = () => {
    if (!newRuleName.trim() || !newRuleTable || !newRuleColumn) {
      toast({ title: 'Missing fields', description: 'Name, table, and column are required.', variant: 'destructive' });
      return;
    }
    const rule: ValidationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      tableName: newRuleTable,
      columnName: newRuleColumn,
      type: newRuleType,
      expression: newRuleExpression.trim(),
      enabled: true,
    };
    setValidationRules((prev) => [...prev, rule]);
    setNewRuleName('');
    setNewRuleTable('');
    setNewRuleColumn('');
    setNewRuleExpression('');
    toast({ title: 'Rule added', description: `${rule.name} added. Run validation to check data.` });
  };

  const handleDeleteRule = (id: string) => {
    setValidationRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Rule removed' });
  };

  const handleRunDuplicateScan = () => {
    if (!dupTable || dupKeyColumns.length === 0) {
      toast({
        title: 'Select table and key columns',
        description: 'Choose a table and at least one column to detect duplicates.',
        variant: 'destructive',
      });
      return;
    }
    setDupScanning(true);
    setDupResults([]);
    // Simulate scan; replace with apiClient.runDuplicateScan(serverId, database, dupTable, dupKeyColumns)
    setTimeout(() => {
      setDupResults([
        { keyValue: 'sample-key-1', tableName: dupTable, columnNames: dupKeyColumns, count: 3, rowIds: ['1', '2', '3'] },
        { keyValue: 'sample-key-2', tableName: dupTable, columnNames: dupKeyColumns, count: 2, rowIds: ['5', '7'] },
      ]);
      setDupScanning(false);
      toast({ title: 'Scan complete', description: `Found ${2} duplicate group(s). Backend integration pending.` });
    }, 1200);
  };

  const handleRunIntegrityCheck = () => {
    setIntegrityChecking(true);
    setIntegrityResults([]);
    // Simulate check; replace with apiClient.runReferentialIntegrityCheck(serverId, database)
    setTimeout(() => {
      setIntegrityResults([
        {
          type: 'orphan',
          tableName: 'orders',
          columnName: 'customer_id',
          referencedTable: 'customers',
          referencedColumn: 'id',
          rowCount: 2,
          message: '2 rows reference missing parent (orphans)',
        },
        {
          type: 'broken_fk',
          tableName: 'order_items',
          columnName: 'order_id',
          referencedTable: 'orders',
          referencedColumn: 'id',
          rowCount: 0,
          message: 'FK constraint valid',
        },
      ]);
      setIntegrityChecking(false);
      toast({ title: 'Integrity check complete', description: 'Backend integration pending.' });
    }, 1500);
  };

  const toggleDupKeyColumn = (col: string) => {
    setDupKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Data Quality Rules</h2>
            <p className="text-sm text-muted-foreground">
              Validation rules, duplicate detection, and referential integrity checks
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
              Add a database server to define and run data quality rules. Go to Servers to add your first connection.
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
        <div className="rounded-lg bg-blue-500/10 p-2.5">
          <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Data Quality Rules</h2>
          <p className="text-sm text-muted-foreground">
            Validation rules, duplicate detection, and referential integrity checks
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </CardTitle>
          <CardDescription>Select server and database to run rules and checks against.</CardDescription>
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
              <SelectTrigger className="w-[200px]">
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
          {selectedServerId && selectedDatabase && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loadingSchema ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{loadingSchema ? 'Loading schema…' : `${tables.length} tables`}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedServerId && selectedDatabase && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTabLocal(v as typeof activeTab)} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="validation" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Validation rules
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicate detection
            </TabsTrigger>
            <TabsTrigger value="integrity" className="gap-2">
              <Link2 className="h-4 w-4" />
              Referential integrity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Add validation rule</CardTitle>
                <CardDescription>Define rules to validate column values (not null, unique, range, regex, or custom SQL).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Rule name</Label>
                    <Input
                      placeholder="e.g. email_not_null"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Table</Label>
                    <Select value={newRuleTable} onValueChange={setNewRuleTable}>
                      <SelectTrigger>
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
                    <Label>Column</Label>
                    <Select value={newRuleColumn} onValueChange={setNewRuleColumn} disabled={!newRuleTable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsForTable(newRuleTable).map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name} ({c.dataType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as ValidationRuleType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALIDATION_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(newRuleType === 'regex' || newRuleType === 'range' || newRuleType === 'custom_sql') && (
                  <div className="space-y-2">
                    <Label>
                      {newRuleType === 'custom_sql' ? 'SQL expression (e.g. LEN(column) &gt; 0)' : 'Expression'}
                    </Label>
                    <Input
                      placeholder={
                        newRuleType === 'regex'
                          ? 'e.g. ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z]{2,}$'
                          : newRuleType === 'range'
                            ? 'e.g. 0,100'
                            : 'Boolean SQL'
                      }
                      value={newRuleExpression}
                      onChange={(e) => setNewRuleExpression(e.target.value)}
                    />
                  </div>
                )}
                <Button onClick={handleAddValidationRule} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add rule
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Rules</CardTitle>
                <CardDescription>Run validation from your pipeline or API; failed rows can be reported here later.</CardDescription>
              </CardHeader>
              <CardContent>
                {validationRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No rules defined. Add one above.</p>
                ) : (
                  <ScrollArea className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Table.Column</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expression</TableHead>
                          <TableHead>Enabled</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationRules.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>{r.tableName}.{r.columnName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{VALIDATION_TYPES.find((x) => x.value === r.type)?.label ?? r.type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.expression || '—'}</TableCell>
                            <TableCell>{r.enabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : '—'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)} aria-label="Delete rule">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Duplicate detection</CardTitle>
                <CardDescription>Select a table and key columns; run scan to find duplicate key groups.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Table</Label>
                    <Select value={dupTable} onValueChange={(v) => { setDupTable(v); setDupKeyColumns([]); }}>
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
                    <Label>Key columns</Label>
                    <div className="flex flex-wrap gap-2 min-w-[200px]">
                      {columnsForTable(dupTable).map((c) => (
                        <label key={c.name} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={dupKeyColumns.includes(c.name)}
                            onCheckedChange={() => toggleDupKeyColumn(c.name)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleRunDuplicateScan} disabled={dupScanning || !dupTable || dupKeyColumns.length === 0}>
                    {dupScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {dupScanning ? 'Scanning…' : 'Run scan'}
                  </Button>
                </div>
                {dupResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Results (sample; backend integration pending)</Label>
                    <ScrollArea className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Key value</TableHead>
                            <TableHead>Table</TableHead>
                            <TableHead>Columns</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Row IDs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dupResults.map((g, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-sm">{g.keyValue}</TableCell>
                              <TableCell>{g.tableName}</TableCell>
                              <TableCell>{g.columnNames.join(', ')}</TableCell>
                              <TableCell>{g.count}</TableCell>
                              <TableCell className="font-mono text-xs">{g.rowIds.join(', ')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrity" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Referential integrity</CardTitle>
                <CardDescription>Check foreign keys for orphans (child rows without parent) and broken references.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {foreignKeys.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No foreign key constraints found in the loaded schema. Load schema for this database to see FKs.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {foreignKeys.length} foreign key(s) in current schema. Run check to detect orphans and broken references.
                    </p>
                    <Button onClick={handleRunIntegrityCheck} disabled={integrityChecking}>
                      {integrityChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      {integrityChecking ? 'Checking…' : 'Run integrity check'}
                    </Button>
                  </>
                )}
                {integrityResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Results (sample; backend integration pending)</Label>
                    <ScrollArea className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Table / Column</TableHead>
                            <TableHead>Referenced</TableHead>
                            <TableHead>Row count</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {integrityResults.map((issue, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Badge variant={issue.type === 'orphan' ? 'destructive' : 'secondary'}>
                                  {issue.type === 'orphan' ? 'Orphan' : 'Broken FK'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {issue.tableName}
                                {issue.columnName && `.${issue.columnName}`}
                              </TableCell>
                              <TableCell>
                                {issue.referencedTable}
                                {issue.referencedColumn && `.${issue.referencedColumn}`}
                              </TableCell>
                              <TableCell>{issue.rowCount}</TableCell>
                              <TableCell className="text-muted-foreground">{issue.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedServerId && !selectedDatabase && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Select a database to define and run data quality rules.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
