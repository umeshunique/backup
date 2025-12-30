import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnvironmentBadge, StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatBytes, formatDuration } from '@/utils/mockData';
import {
  Database,
  Calendar,
  Server,
  Table2,
  FileCode,
  Eye,
  Zap,
  Upload,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Activity,
  Package,
  Rocket,
  Clock,
  Filter,
  Loader2,
} from 'lucide-react';
import { format, isToday, isSameDay } from 'date-fns';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const {
    servers,
    backupHistory,
    serverBuilds,
    releaseDeployments,
    setActiveTab,
    getDatabasesForServer,
    loadDatabasesForServer,
    loadDatabaseSchema,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'custom'>('all');
  const [loadingSchema, setLoadingSchema] = useState(false);

  const selectedServer = servers.find(s => s.id === selectedServerId);
  const serverDatabases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];

  // Select first server by default
  useEffect(() => {
    if (!selectedServerId && servers.length > 0) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  // Load databases when server is selected
  useEffect(() => {
    if (selectedServerId) {
      loadDatabasesForServer(selectedServerId);
    }
  }, [selectedServerId, loadDatabasesForServer]);

  // Load full database schema when a database is selected
  useEffect(() => {
    const loadSchema = async () => {
      if (selectedServerId && selectedDatabaseName) {
        // Check if schema is already loaded
        const currentDb = serverDatabases.find(db => db.name === selectedDatabaseName);
        const hasData = currentDb && currentDb.tables && currentDb.tables.length > 0;

        // Only show loading and fetch if data not already present
        if (!hasData) {
          setLoadingSchema(true);
        }

        await loadDatabaseSchema(selectedServerId, selectedDatabaseName);
        setLoadingSchema(false);
      }
    };
    loadSchema();
  }, [selectedServerId, selectedDatabaseName, loadDatabaseSchema, serverDatabases]);

  // Today's events
  const todayBackups = backupHistory.filter(b => {
    const backupDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return isToday(backupDate);
  });

  const todayBuilds = serverBuilds.filter(b => {
    const buildDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return isToday(buildDate);
  });

  const todayReleases = releaseDeployments.filter(r => {
    const releaseDate = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
    return isToday(releaseDate);
  });

  // Database object counts
  const totalTables = serverDatabases.reduce((sum, db) => sum + (db.tables?.length || 0), 0);
  const totalProcedures = serverDatabases.reduce((sum, db) => sum + (db.procedures?.length || 0), 0);
  const totalViews = serverDatabases.reduce((sum, db) => sum + (db.views?.length || 0), 0);
  const totalTriggers = serverDatabases.reduce((sum, db) => sum + (db.triggers?.length || 0), 0);
  const totalFunctions = serverDatabases.reduce((sum, db) => sum + (db.functions?.length || 0), 0);

  // Get objects created today
  const getTodayCreatedObjects = () => {
    let todayTables = 0;
    let todayProcedures = 0;
    let todayViews = 0;
    let todayTriggers = 0;
    let todayFunctions = 0;

    serverDatabases.forEach(db => {
      todayTables += db.tables?.filter(t => t.createdDate && isToday(new Date(t.createdDate))).length || 0;
      todayProcedures += db.procedures?.filter(p => p.createdDate && isToday(new Date(p.createdDate))).length || 0;
      todayViews += db.views?.filter(v => v.createdDate && isToday(new Date(v.createdDate))).length || 0;
      todayTriggers += db.triggers?.filter(t => t.createdDate && isToday(new Date(t.createdDate))).length || 0;
      todayFunctions += db.functions?.filter(f => f.createdDate && isToday(new Date(f.createdDate))).length || 0;
    });

    return { todayTables, todayProcedures, todayViews, todayTriggers, todayFunctions };
  };

  const todayObjects = getTodayCreatedObjects();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Empty State - No Servers */}
      {servers.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Server className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Database Servers Configured</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Get started by adding your first database server to begin managing backups, comparing schemas, and deploying releases.
          </p>
          <Button onClick={() => setActiveTab('servers')} size="lg">
            <Server className="h-5 w-5 mr-2" />
            Add Your First Server
          </Button>
        </div>
      )}

      {/* Server Selector */}
      {servers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Select Server</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('servers')}>
                <Server className="h-4 w-4 mr-2" />
                Manage Servers
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {servers.map((server) => (
                  <Button
                    key={server.id}
                    variant={selectedServerId === server.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedServerId(server.id)}
                    className="flex items-center gap-2"
                  >
                    {server.connectionStatus === 'connected' ? (
                      <Wifi className="h-3 w-3 text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-400" />
                    )}
                    {server.name}
                    <EnvironmentBadge environment={server.environment} size="sm" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Selected Server Info */}
      {selectedServer && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Database className="h-6 w-6" />
                  {selectedServer.name}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {selectedServer.host}:{selectedServer.port}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedServer.databaseType.toUpperCase()} • {serverDatabases.length} databases
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={selectedServer.connectionStatus === 'connected' ? 'default' : 'destructive'}>
                  {selectedServer.connectionStatus === 'connected' ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Disconnected</>
                  )}
                </Badge>
                <EnvironmentBadge environment={selectedServer.environment} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Selector and Object Counts */}
      {selectedServer && serverDatabases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Database Objects</CardTitle>
              <div className="flex items-center gap-3 flex-1 max-w-2xl">
                <Select
                  value={selectedDatabaseName || ''}
                  onValueChange={(value) => setSelectedDatabaseName(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serverDatabases.map((db) => (
                      <SelectItem key={db.name} value={db.name}>
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDatabaseName && (
                  <div className="flex gap-1">
                    <Button
                      variant={dateFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setDateFilter('all');
                        setSelectedDate(undefined);
                      }}
                    >
                      All
                    </Button>
                    <Button
                      variant={dateFilter === 'today' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setDateFilter('today');
                        setSelectedDate(new Date());
                      }}
                    >
                      Today
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={dateFilter === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          className="gap-2"
                          onClick={() => setDateFilter('custom')}
                        >
                          <Calendar className="h-4 w-4" />
                          {dateFilter === 'custom' && selectedDate ? format(selectedDate, 'MMM d') : 'Custom'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setDateFilter('custom');
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDatabaseName ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a database to view object counts and details</p>
              </div>
            ) : loadingSchema ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center max-w-md">
                  <p className="text-base font-medium mb-1">Loading {selectedDatabaseName}</p>
                  <p className="text-sm text-muted-foreground">
                    Analyzing database structure, fetching all objects and their metadata...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    This may take a moment for large databases
                  </p>
                </div>
              </div>
            ) : (() => {
              const selectedDb = serverDatabases.find(db => db.name === selectedDatabaseName);
              if (!selectedDb) return null;

              const filterByDate = (items: any[] | undefined) => {
                if (!items) return [];
                if (dateFilter === 'all') {
                  return items;
                } else if (dateFilter === 'today') {
                  return items.filter(item => item.createdDate && isToday(new Date(item.createdDate)));
                } else if (dateFilter === 'custom' && selectedDate) {
                  return items.filter(item => {
                    if (!item.createdDate) return false;
                    return isSameDay(new Date(item.createdDate), selectedDate);
                  });
                }
                return items;
              };

              const filteredTables = filterByDate(selectedDb.tables);
              const filteredProcedures = filterByDate(selectedDb.procedures);
              const filteredViews = filterByDate(selectedDb.views);
              const filteredTriggers = filterByDate(selectedDb.triggers);
              const filteredFunctions = filterByDate(selectedDb.functions);

              return (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Table2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-4xl font-bold mb-1">{filteredTables.length}</p>
                      <p className="text-sm text-muted-foreground">Tables</p>
                      {dateFilter !== 'all' && (
                        <p className="text-xs text-blue-500 mt-1">
                          of {selectedDb.tables?.length || 0} total
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileCode className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-4xl font-bold mb-1">{filteredProcedures.length}</p>
                      <p className="text-sm text-muted-foreground">Stored Procedures</p>
                      {dateFilter !== 'all' && (
                        <p className="text-xs text-purple-500 mt-1">
                          of {selectedDb.procedures?.length || 0} total
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <Eye className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-4xl font-bold mb-1">{filteredViews.length}</p>
                      <p className="text-sm text-muted-foreground">Views</p>
                      {dateFilter !== 'all' && (
                        <p className="text-xs text-green-500 mt-1">
                          of {selectedDb.views?.length || 0} total
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-4xl font-bold mb-1">{filteredTriggers.length}</p>
                      <p className="text-sm text-muted-foreground">Triggers</p>
                      {dateFilter !== 'all' && (
                        <p className="text-xs text-yellow-500 mt-1">
                          of {selectedDb.triggers?.length || 0} total
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileCode className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-4xl font-bold mb-1">{filteredFunctions.length}</p>
                      <p className="text-sm text-muted-foreground">Functions</p>
                      {dateFilter !== 'all' && (
                        <p className="text-xs text-orange-500 mt-1">
                          of {selectedDb.functions?.length || 0} total
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Today's Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Events
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Today's Backups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" />
                Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">{todayBackups.length}</p>
                  <p className="text-xs text-muted-foreground">Total today</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-sm font-semibold text-green-500">
                      {todayBackups.filter(b => b.status === 'success').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-500">
                      {todayBackups.filter(b => b.status === 'failed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-500">
                      {todayBackups.filter(b => b.status === 'pending').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab('history')}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Builds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                Builds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">{todayBuilds.length}</p>
                  <p className="text-xs text-muted-foreground">Total today</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-sm font-semibold text-green-500">
                      {todayBuilds.filter(b => b.status === 'completed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-500">
                      {todayBuilds.filter(b => b.status === 'failed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab('builds')}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Releases */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Rocket className="h-4 w-4 text-orange-500" />
                Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">{todayReleases.length}</p>
                  <p className="text-xs text-muted-foreground">Total today</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-sm font-semibold text-green-500">
                      {todayReleases.filter(r => r.status === 'completed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-500">
                      {todayReleases.filter(r => r.status === 'failed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab('release')}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      {(todayBackups.length > 0 || todayBuilds.length > 0 || todayReleases.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {/* Backups */}
                {todayBackups.slice(0, 5).map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{backup.databaseName}</p>
                        <StatusBadge status={backup.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(backup.createdAt instanceof Date ? backup.createdAt : new Date(backup.createdAt), 'HH:mm:ss')}
                        </span>
                        <span>{formatBytes(backup.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Builds */}
                {todayBuilds.slice(0, 3).map((build) => (
                  <div
                    key={build.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setActiveTab('builds')}
                  >
                    <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{build.buildVersion.version}</p>
                        <Badge variant={build.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                          {build.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(build.createdAt, 'HH:mm:ss')}
                        </span>
                        <span>{build.artifacts.length} artifacts</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Releases */}
                {todayReleases.slice(0, 3).map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setActiveTab('release')}
                  >
                    <Rocket className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{release.name}</p>
                        <Badge variant={release.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                          {release.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(release.createdAt, 'HH:mm:ss')}
                        </span>
                        <span>{release.sourceServer.name} → {release.targetServer.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
