import React, { useEffect, useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  LineChart,
  Database,
  Server as ServerIcon,
  Plus,
  Search,
  User,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/** Sample trace event for UI demo. Replace with API when backend supports profiler. */
export interface TraceEvent {
  id: string;
  startTime: string;
  durationMs: number;
  logicalReads: number;
  physicalReads: number;
  writes: number;
  databaseName: string;
  userName: string;
  sqlText: string;
  applicationName?: string;
}

const SAMPLE_TRACE: TraceEvent[] = [
  {
    id: '1',
    startTime: new Date(Date.now() - 120_000).toISOString(),
    durationMs: 45,
    logicalReads: 120,
    physicalReads: 8,
    writes: 2,
    databaseName: 'app_db',
    userName: 'app_user',
    sqlText: 'SELECT id, name, created_at FROM users WHERE status = ? ORDER BY created_at DESC LIMIT 100',
  },
  {
    id: '2',
    startTime: new Date(Date.now() - 95_000).toISOString(),
    durationMs: 312,
    logicalReads: 2400,
    physicalReads: 120,
    writes: 0,
    databaseName: 'app_db',
    userName: 'report_user',
    sqlText: 'SELECT o.id, o.total, c.name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.created_at >= ?',
  },
  {
    id: '3',
    startTime: new Date(Date.now() - 70_000).toISOString(),
    durationMs: 8,
    logicalReads: 4,
    physicalReads: 0,
    writes: 1,
    databaseName: 'app_db',
    userName: 'app_user',
    sqlText: 'UPDATE sessions SET last_activity = ? WHERE id = ?',
  },
  {
    id: '4',
    startTime: new Date(Date.now() - 50_000).toISOString(),
    durationMs: 1890,
    logicalReads: 52000,
    physicalReads: 3400,
    writes: 0,
    databaseName: 'analytics_db',
    userName: 'report_user',
    sqlText: 'SELECT date_trunc(\'day\', event_time), COUNT(*), SUM(amount) FROM events GROUP BY 1 ORDER BY 1',
  },
  {
    id: '5',
    startTime: new Date(Date.now() - 25_000).toISOString(),
    durationMs: 2,
    logicalReads: 2,
    physicalReads: 0,
    writes: 0,
    databaseName: 'app_db',
    userName: 'app_user',
    sqlText: 'SELECT 1',
  },
];

function formatDurationMs(ms: number): string {
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatReads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ProfilerPage() {
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
  const [filterDatabase, setFilterDatabase] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('');
  const [traceRunning, setTraceRunning] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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

  const traceData = useMemo(() => SAMPLE_TRACE, []);
  const uniqueDatabases = useMemo(
    () => Array.from(new Set(traceData.map((e) => e.databaseName))).sort(),
    [traceData]
  );
  const uniqueUsers = useMemo(
    () => Array.from(new Set(traceData.map((e) => e.userName))).sort(),
    [traceData]
  );

  const filteredTrace = useMemo(() => {
    return traceData.filter((e) => {
      if (filterDatabase !== 'all' && e.databaseName !== filterDatabase) return false;
      if (filterUser.trim() && !e.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
      return true;
    });
  }, [traceData, filterDatabase, filterUser]);

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <LineChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Profiler / Query Trace</h2>
            <p className="text-sm text-muted-foreground">
              Trace SQL execution: duration, reads, writes. Filter by database or user.
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
              Add a database server to trace query execution. Go to Servers to add your first connection.
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
          <LineChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Profiler / Query Trace</h2>
          <p className="text-sm text-muted-foreground">
            Trace SQL execution: duration, reads, writes. Filter by database or user.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          Sample trace data shown. Full feature UI is in place; live trace and backend integration can be added when the profiler API is available.
        </span>
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
          {selectedServer && selectedDatabase && (
            <Badge variant="secondary" className="font-mono text-xs">
              {selectedServer.name} / {selectedDatabase}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Trace filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={traceRunning ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setTraceRunning(!traceRunning)}
                className="gap-2"
              >
                {traceRunning ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Stop trace
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Start trace
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[180px]">
            <Label className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              Database
            </Label>
            <Select value={filterDatabase} onValueChange={setFilterDatabase}>
              <SelectTrigger>
                <SelectValue placeholder="All databases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All databases</SelectItem>
                {uniqueDatabases.map((db) => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[180px]">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              User
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by user..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Trace events</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredTrace.length} event{filteredTrace.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Start time</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Reads</TableHead>
                  <TableHead className="text-right">Writes</TableHead>
                  <TableHead>Database</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="min-w-[240px]">SQL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrace.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No trace events match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrace.map((event) => {
                    const isExpanded = expandedRowId === event.id;
                    const sqlPreview =
                      event.sqlText.length > 60
                        ? event.sqlText.slice(0, 60).trim() + '…'
                        : event.sqlText;
                    return (
                      <React.Fragment key={event.id}>
                        <TableRow
                          className={cn(
                            'cursor-pointer',
                            isExpanded && 'bg-muted/50'
                          )}
                          onClick={() =>
                            setExpandedRowId(isExpanded ? null : event.id)
                          }
                        >
                          <TableCell className="w-8 py-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {format(new Date(event.startTime), 'HH:mm:ss.SSS')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatDurationMs(event.durationMs)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <span title={`Logical: ${event.logicalReads}, Physical: ${event.physicalReads}`}>
                              {formatReads(event.logicalReads)} / {formatReads(event.physicalReads)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {event.writes}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {event.databaseName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {event.userName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[320px] truncate">
                            {sqlPreview}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8} className="p-4">
                              <div className="rounded-md bg-background border p-3 font-mono text-xs overflow-x-auto whitespace-pre break-all">
                                {event.sqlText}
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
  );
}
