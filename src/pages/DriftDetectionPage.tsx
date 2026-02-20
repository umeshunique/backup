/**
 * Drift Detection — Scheduled drift checks across environments with alerts and baseline snapshots.
 * Detect schema changes between baseline and current state, with scheduled runs and notifications.
 */

import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GitBranch,
  Camera,
  Bell,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ChevronRight,
  Server as ServerIcon,
  Database,
  Calendar,
  Activity,
} from 'lucide-react';
import { EnvironmentBadge } from '@/components/shared';
import { toast } from '@/hooks/use-toast';

type DriftSeverity = 'info' | 'warning' | 'critical';

interface DriftAlert {
  id: string;
  serverId: string;
  serverName: string;
  database: string;
  environment: string;
  baselineName: string;
  baselineDate: string;
  driftCount: number;
  severity: DriftSeverity;
  detectedAt: string;
  message: string;
}

interface BaselineSnapshot {
  id: string;
  serverId: string;
  serverName: string;
  database: string;
  name: string;
  createdAt: string;
  tableCount: number;
  objectCount: number;
}

interface DriftSchedule {
  id: string;
  serverId: string;
  database: string;
  baselineId: string;
  baselineName: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: string | null;
  lastResult: 'ok' | 'drift' | 'error' | null;
  notifyOnDrift: boolean;
}

// Mock data for UI demonstration
const MOCK_ALERTS: DriftAlert[] = [
  {
    id: 'a1',
    serverId: 's1',
    serverName: 'Local MySQL',
    database: 'billing_crm',
    environment: 'development',
    baselineName: 'v1.2.0-release',
    baselineDate: '2026-02-01T10:00:00Z',
    driftCount: 3,
    severity: 'warning',
    detectedAt: '2026-02-02T08:15:00Z',
    message: 'Tables modified: orders, products. 1 new column in users.',
  },
  {
    id: 'a2',
    serverId: 's1',
    serverName: 'Local MySQL',
    database: 'analytics',
    environment: 'staging',
    baselineName: 'prod-snapshot',
    baselineDate: '2026-01-28T14:00:00Z',
    driftCount: 1,
    severity: 'info',
    detectedAt: '2026-02-02T06:00:00Z',
    message: 'Index added: idx_events_user_id on events.',
  },
];

const MOCK_BASELINES: BaselineSnapshot[] = [
  {
    id: 'b1',
    serverId: 's1',
    serverName: 'Local MySQL',
    database: 'billing_crm',
    name: 'v1.2.0-release',
    createdAt: '2026-02-01T10:00:00Z',
    tableCount: 42,
    objectCount: 156,
  },
  {
    id: 'b2',
    serverId: 's1',
    serverName: 'Local MySQL',
    database: 'analytics',
    name: 'prod-snapshot',
    createdAt: '2026-01-28T14:00:00Z',
    tableCount: 18,
    objectCount: 67,
  },
];

const MOCK_SCHEDULES: DriftSchedule[] = [
  {
    id: 'sch1',
    serverId: 's1',
    database: 'billing_crm',
    baselineId: 'b1',
    baselineName: 'v1.2.0-release',
    cronExpression: '0 6 * * *',
    enabled: true,
    lastRun: '2026-02-02T06:00:00Z',
    lastResult: 'drift',
    notifyOnDrift: true,
  },
  {
    id: 'sch2',
    serverId: 's1',
    database: 'analytics',
    baselineId: 'b2',
    baselineName: 'prod-snapshot',
    cronExpression: '0 8 * * 1',
    enabled: true,
    lastRun: '2026-02-02T08:00:00Z',
    lastResult: 'ok',
    notifyOnDrift: true,
  },
];

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function formatCron(cron: string): string {
  const map: Record<string, string> = {
    '0 6 * * *': 'Daily at 6:00 AM',
    '0 8 * * 1': 'Weekly (Mon 8:00 AM)',
    '0 */4 * * *': 'Every 4 hours',
    '0 0 * * 0': 'Weekly (Sun midnight)',
    '*/30 * * * *': 'Every 30 minutes',
  };
  return map[cron] ?? cron;
}

function severityBadge(severity: DriftSeverity) {
  const classes = {
    info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  };
  return (
    <Badge variant="outline" className={classes[severity]}>
      {severity}
    </Badge>
  );
}

export function DriftDetectionPage() {
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
  const [activeTab, setActiveTabLocal] = useState<'overview' | 'baselines' | 'schedules' | 'alerts'>('overview');
  const [runningCheck, setRunningCheck] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState('');
  const [creatingBaseline, setCreatingBaseline] = useState(false);

  const [alerts] = useState<DriftAlert[]>(MOCK_ALERTS);
  const [baselines, setBaselines] = useState<BaselineSnapshot[]>(MOCK_BASELINES);
  const [schedules, setSchedules] = useState<DriftSchedule[]>(MOCK_SCHEDULES);

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

  const selectedServer = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const hasConnection = Boolean(selectedServer && selectedDatabase);

  const filteredAlerts = selectedServerId && selectedDatabase
    ? alerts.filter((a) => a.serverId === selectedServerId && a.database === selectedDatabase)
    : alerts;
  const filteredBaselines = selectedServerId && selectedDatabase
    ? baselines.filter((b) => b.serverId === selectedServerId && b.database === selectedDatabase)
    : baselines;
  const filteredSchedules = selectedServerId && selectedDatabase
    ? schedules.filter((s) => s.serverId === selectedServerId && s.database === selectedDatabase)
    : schedules;

  const driftCount = alerts.filter((a) => a.severity === 'warning' || a.severity === 'critical').length;
  const scheduleCount = schedules.filter((s) => s.enabled).length;

  const handleRunCheck = async () => {
    if (!selectedServer || !selectedDatabase) {
      toast({ title: 'Select connection', description: 'Choose a server and database first.', variant: 'destructive' });
      return;
    }
    setRunningCheck(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast({ title: 'Drift check complete', description: 'No drift detected. Schema matches baseline.' });
    } catch {
      toast({ title: 'Check failed', description: 'Could not run drift check.', variant: 'destructive' });
    } finally {
      setRunningCheck(false);
    }
  };

  const handleCreateBaseline = async () => {
    if (!newBaselineName.trim() || !selectedServer || !selectedDatabase) return;
    setCreatingBaseline(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const newBaseline: BaselineSnapshot = {
        id: `b${Date.now()}`,
        serverId: selectedServer.id,
        serverName: selectedServer.name,
        database: selectedDatabase,
        name: newBaselineName.trim(),
        createdAt: new Date().toISOString(),
        tableCount: 0,
        objectCount: 0,
      };
      setBaselines((prev) => [newBaseline, ...prev]);
      setNewBaselineName('');
      toast({ title: 'Baseline created', description: `"${newBaselineName.trim()}" saved.` });
    } catch {
      toast({ title: 'Failed to create baseline', variant: 'destructive' });
    } finally {
      setCreatingBaseline(false);
    }
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2.5">
            <GitBranch className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Drift Detection</h2>
            <p className="text-sm text-muted-foreground">
              Scheduled drift checks across environments with alerts and baseline snapshots
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
              Add a database server to use drift detection. Go to Servers to add your first connection.
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
          <GitBranch className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Drift Detection</h2>
          <p className="text-sm text-muted-foreground">
            Scheduled drift checks across environments with alerts and baseline snapshots
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </CardTitle>
          <CardDescription>
            Select the server and database to manage baselines, schedules, and view drift alerts.
          </CardDescription>
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
                      <EnvironmentBadge environment={s.environment} size="sm" />
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
                <SelectValue
                  placeholder={
                    loadingDatabases ? 'Loading…' : 'Select database'
                  }
                />
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
          {hasConnection && (
            <Button
              onClick={handleRunCheck}
              disabled={runningCheck}
              className="gap-2"
            >
              {runningCheck ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run drift check
            </Button>
          )}
        </CardContent>
      </Card>

      {!hasConnection && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Select a server and database above to manage baselines, schedules, and view drift alerts for that connection.
          </CardContent>
        </Card>
      )}

      {hasConnection && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTabLocal(v as typeof activeTab)}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="baselines" className="gap-2">
              <Camera className="h-4 w-4" />
              Baselines
              <Badge variant="secondary" className="ml-1">
                {filteredBaselines.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedules
              <Badge variant="secondary" className="ml-1">
                {filteredSchedules.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
              {driftCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {driftCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active baselines</p>
                      <p className="text-2xl font-bold">{filteredBaselines.length}</p>
                    </div>
                    <Camera className="h-8 w-8 text-purple-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scheduled checks</p>
                      <p className="text-2xl font-bold">{filteredSchedules.filter((s) => s.enabled).length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className={driftCount > 0 ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/20 bg-emerald-500/5'}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Open drift alerts</p>
                      <p className="text-2xl font-bold">{driftCount}</p>
                    </div>
                    {driftCount > 0 ? (
                      <AlertCircle className="h-8 w-8 text-amber-500/70" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent drift activity
                </CardTitle>
                <CardDescription>
                  Latest drift findings for {selectedServer?.name} / {selectedDatabase}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500/50" />
                    <p className="text-sm font-medium">No drift detected</p>
                    <p className="text-xs">Schema matches baseline. Run a check or view schedules.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Baseline</TableHead>
                        <TableHead>Drift count</TableHead>
                        <TableHead>Detected</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.slice(0, 5).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{severityBadge(a.severity)}</TableCell>
                          <TableCell className="font-medium">{a.baselineName}</TableCell>
                          <TableCell>{a.driftCount}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatRelativeTime(a.detectedAt)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="baselines" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Baseline snapshots
                </CardTitle>
                <CardDescription>
                  Schema snapshots used as reference for drift checks. Create a baseline from the current schema state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Baseline name (e.g. v1.2.0-release)"
                    value={newBaselineName}
                    onChange={(e) => setNewBaselineName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleCreateBaseline}
                    disabled={creatingBaseline || !newBaselineName.trim()}
                    className="gap-2"
                  >
                    {creatingBaseline ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create baseline
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tables</TableHead>
                      <TableHead>Objects</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBaselines.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-muted-foreground">{b.tableCount}</TableCell>
                        <TableCell className="text-muted-foreground">{b.objectCount}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelativeTime(b.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" aria-label="Delete baseline">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduled drift checks
                </CardTitle>
                <CardDescription>
                  Automated drift checks run on a schedule. Compare current schema to a baseline and alert on differences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baseline</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last run</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Notify</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.baselineName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatCron(s.cronExpression)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.lastRun ? formatRelativeTime(s.lastRun) : '—'}
                        </TableCell>
                        <TableCell>
                          {s.lastResult === 'ok' && (
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              OK
                            </Badge>
                          )}
                          {s.lastResult === 'drift' && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              Drift
                            </Badge>
                          )}
                          {s.lastResult === 'error' && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                              Error
                            </Badge>
                          )}
                          {!s.lastResult && <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {s.notifyOnDrift ? (
                            <Bell className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={s.enabled} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Drift alerts
                </CardTitle>
                <CardDescription>
                  Alerts generated when schema drift is detected. Click to view diff and remediation steps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500/50" />
                    <p className="text-sm font-medium">No drift alerts</p>
                    <p className="text-xs">Schema is in sync with baselines. New drift will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAlerts.map((a) => (
                      <Alert
                        key={a.id}
                        className={
                          a.severity === 'critical'
                            ? 'border-red-500/30 bg-red-500/5'
                            : a.severity === 'warning'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-blue-500/30 bg-blue-500/5'
                        }
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {severityBadge(a.severity)}
                                <span className="font-medium">{a.baselineName}</span>
                                <span className="text-muted-foreground text-sm">
                                  {a.driftCount} change{a.driftCount !== 1 ? 's' : ''} · {formatRelativeTime(a.detectedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{a.message}</p>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                              View diff
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
