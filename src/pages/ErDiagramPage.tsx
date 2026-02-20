import { useEffect, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { EnhancedDataModelViewer } from '@/components/server/EnhancedDataModelViewer';
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
import { Network, Database, Server as ServerIcon, Plus } from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';

export function ErDiagramPage() {
  const {
    servers,
    selectedServerId: storeServerId,
    selectedDatabaseName: storeDatabaseName,
    selectServer,
    selectDatabase,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    getServerById,
    setActiveTab,
  } = useBackupStore();

  const [loadingDatabases, setLoadingDatabases] = useState(false);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!storeServerId) return;
    setLoadingDatabases(true);
    loadDatabasesForServer(storeServerId).finally(() => setLoadingDatabases(false));
  }, [storeServerId, loadDatabasesForServer]);

  const selectedServerId = storeServerId;
  const selectedDatabase = storeDatabaseName;
  const selectedServer: ServerConfig | undefined = selectedServerId
    ? getServerById(selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const canShowDiagram = selectedServer && selectedDatabase;

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2.5">
            <Network className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">ER Diagram / Data Modeler</h2>
            <p className="text-sm text-muted-foreground">
              Entity-relationship diagram with auto-layout, relationships, and export to image/PDF
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
              Add a database server to visualize entity-relationship diagrams. Go to Servers to add your first connection.
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
        <div className="rounded-lg bg-violet-500/10 p-2.5">
          <Network className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">ER Diagram / Data Modeler</h2>
          <p className="text-sm text-muted-foreground">
            Entity-relationship diagram with auto-layout, relationships, and export to image/PDF
          </p>
        </div>
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
              onValueChange={(v) => selectServer(v || null)}
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
              onValueChange={(v) => selectDatabase(v || null)}
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {selectedServer.name} / {selectedDatabase}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {canShowDiagram && selectedServer && selectedDatabase && (
        <EnhancedDataModelViewer server={selectedServer} database={selectedDatabase} />
      )}

      {selectedServerId && selectedServer && !selectedDatabase && databases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Select a database above to view the entity-relationship diagram.
          </CardContent>
        </Card>
      )}

      {selectedServerId && selectedServer && databases.length === 0 && !loadingDatabases && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No databases found on this server, or still loading. Try another server.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
