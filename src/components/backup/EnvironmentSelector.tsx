import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnvironmentBadge } from '@/components/shared';
import { BackupWizardState } from './BackupWizard';
import { cn } from '@/lib/utils';
import { Database, Search, Wifi, WifiOff, HardDrive, Table2, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface EnvironmentSelectorProps {
  state: BackupWizardState;
  onUpdate: (updates: Partial<BackupWizardState>) => void;
}

export function EnvironmentSelector({ state, onUpdate }: EnvironmentSelectorProps) {
  const { servers, getDatabasesForServer, loadDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedServerIdRef = useRef<string | null>(null);

  const selectedServer = servers.find((s) => s.id === state.serverId);
  const databases = state.serverId ? getDatabasesForServer(state.serverId) : [];

  // Load databases when server is selected (once per server)
  useEffect(() => {
    if (!state.serverId) {
      loadedServerIdRef.current = null;
      setLoadError(null);
      return;
    }
    // Avoid re-running when we already have data or already attempted load for this server
    if (databases.length > 0) {
      loadedServerIdRef.current = state.serverId;
      setLoadError(null);
      return;
    }
    if (loadedServerIdRef.current === state.serverId) {
      return; // Already attempted load for this server (avoid infinite retry on failure)
    }

    loadedServerIdRef.current = state.serverId;
    setLoadError(null);
    const loadDatabases = async () => {
      setIsLoadingDatabases(true);
      try {
        await loadDatabasesForServer(state.serverId!);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load databases';
        setLoadError(message);
        console.error('EnvironmentSelector: load databases failed', err);
      } finally {
        setIsLoadingDatabases(false);
      }
    };
    loadDatabases();
  }, [state.serverId, loadDatabasesForServer, databases.length]);

  // Handler for database selection: update UI immediately, then load full schema if needed
  const handleDatabaseSelect = async (schema: any) => {
    // Update selection immediately so the card highlights and summary shows
    onUpdate({ database: schema });

    // Load full schema only when we have minimal schema (needed for Scope step)
    const needsFullSchema = state.serverId && (
      (schema.tableCount === 0 && (!schema.tables || schema.tables.length === 0))
    );
    if (!needsFullSchema) return;

    try {
      await loadDatabaseSchema(state.serverId!, schema.name);
      const updatedDatabases = getDatabasesForServer(state.serverId!);
      const updatedSchema = updatedDatabases.find((db) => db.name === schema.name);
      if (updatedSchema) {
        onUpdate({ database: updatedSchema });
      }
    } catch (err) {
      console.error('EnvironmentSelector: load schema failed', err);
      // Keep the minimal schema selected so user can still proceed; Scope step will show empty until they retry
      setLoadError(err instanceof Error ? err.message : 'Failed to load database details');
    }
  };

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Server Selection */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Select Environment / Server</Label>
        <ScrollArea className="h-[400px] rounded-lg border border-border">
          <div className="p-2 space-y-2">
            {servers.map((server) => {
              const isSelected = state.serverId === server.id;
              const dbCount = getDatabasesForServer(server.id).length;

              return (
                <button
                  key={server.id}
                  onClick={() =>
                    onUpdate({
                      serverId: server.id,
                      environment: server.environment,
                      database: null,
                    })
                  }
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 shadow-sm'
                      : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg p-2',
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    )}
                  >
                    <Database
                      className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{server.name}</span>
                      {server.connectionStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">
                        {server.host}:{server.port}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {dbCount} database(s)
                      </span>
                    </div>
                  </div>

                  <EnvironmentBadge environment={server.environment} size="sm" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Database Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Database / Schema</Label>
          {isLoadingDatabases ? (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Loading databases...
            </Badge>
          ) : state.serverId && databases.length > 0 ? (
            <Badge variant="outline" className="text-xs">
              {databases.length} available
            </Badge>
          ) : null}
        </div>

        {!state.serverId ? (
          <div className="h-[400px] rounded-lg border border-dashed border-border flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a server to view databases</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {loadError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {loadError}
              </div>
            )}
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search databases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[350px] rounded-lg border border-border">
              <div className="p-2 space-y-2">
                {filteredDatabases.length === 0 && !isLoadingDatabases ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {loadError ? 'Could not load databases. Check connection and try again.' : 'No databases found'}
                  </div>
                ) : (
                  filteredDatabases.map((db) => {
                    const isSelected = state.database?.name === db.name;

                    return (
                      <button
                        key={db.name}
                        onClick={() => handleDatabaseSelect(db)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border border-primary/30 shadow-sm'
                            : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg p-2',
                            isSelected ? 'bg-primary/20' : 'bg-muted'
                          )}
                        >
                          <HardDrive
                            className={cn(
                              'h-5 w-5',
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="font-medium font-mono">{db.name}</span>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Table2 className="h-3 w-3" />
                              {db.tableCount} tables
                            </span>
                            <span>{(db.sizeInMB ?? 0).toFixed(1)} MB</span>
                            {db.lastBackupDate && (
                              <span>
                                Last backup: {format(db.lastBackupDate, 'MMM d, HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {state.database && (
        <div className="lg:col-span-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Database className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">{state.database.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedServer?.name} ({selectedServer?.host})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{state.database.tableCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tables</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{state.database.procedures?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Procedures</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{state.database.views?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{(state.database.sizeInMB ?? 0).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">MB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
