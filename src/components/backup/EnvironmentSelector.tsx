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
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface EnvironmentSelectorProps {
  state: BackupWizardState;
  onUpdate: (updates: Partial<BackupWizardState>) => void;
}

export function EnvironmentSelector({ state, onUpdate }: EnvironmentSelectorProps) {
  const { servers, getDatabasesForServer, loadDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);

  const selectedServer = servers.find((s) => s.id === state.serverId);
  const databases = state.serverId ? getDatabasesForServer(state.serverId) : [];

  // Load databases when server is selected
  useEffect(() => {
    if (state.serverId && databases.length === 0) {
      const loadDatabases = async () => {
        setIsLoadingDatabases(true);
        await loadDatabasesForServer(state.serverId!);
        setIsLoadingDatabases(false);
      };
      loadDatabases();
    }
  }, [state.serverId, loadDatabasesForServer, databases.length]);

  // Handler for database selection
  const handleDatabaseSelect = async (schema: any) => {
    // Load the full schema details if not already loaded
    if (state.serverId && schema.tableCount === 0 && schema.tables.length === 0) {
      await loadDatabaseSchema(state.serverId, schema.name);

      // Get the updated schema from the store after loading
      const updatedDatabases = getDatabasesForServer(state.serverId);
      const updatedSchema = updatedDatabases.find(db => db.name === schema.name);

      // Update the UI with the loaded schema
      onUpdate({ database: updatedSchema || schema });
    } else {
      // Schema already loaded, just update the selection
      onUpdate({ database: schema });
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
                {filteredDatabases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No databases found
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
                            <span>{db.sizeInMB.toFixed(1)} MB</span>
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
                    <p className="text-2xl font-bold text-primary">{state.database.tableCount}</p>
                    <p className="text-xs text-muted-foreground">Tables</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{state.database.procedures.length}</p>
                    <p className="text-xs text-muted-foreground">Procedures</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{state.database.views.length}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{state.database.sizeInMB.toFixed(0)}</p>
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
