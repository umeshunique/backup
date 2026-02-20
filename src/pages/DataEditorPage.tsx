import { useEffect, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { TablesBrowser } from '@/components/server/TablesBrowser';
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
import { Table2, Database, Server as ServerIcon, Plus } from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';

export function DataEditorPage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    setActiveTab,
    selectedServerId: storeServerId,
    selectedDatabaseName: storeDatabaseName,
    selectedTableName: storeTableName,
    setSelectedTableName,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  // Sync with global server/database selection from ServerDatabaseBar when present
  useEffect(() => {
    if (storeServerId && servers.some((s) => s.id === storeServerId)) {
      setSelectedServerId(storeServerId);
      if (storeDatabaseName) setSelectedDatabase(storeDatabaseName);
    }
  }, [storeServerId, storeDatabaseName, servers]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!selectedServerId) {
      setSelectedDatabase(null);
      return;
    }
    if (!(storeServerId === selectedServerId && storeDatabaseName)) setSelectedDatabase(null);
    setLoadingDatabases(true);
    loadDatabasesForServer(selectedServerId).finally(() => setLoadingDatabases(false));
  }, [selectedServerId, loadDatabasesForServer, storeServerId, storeDatabaseName]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const canEdit = selectedServer && selectedDatabase;

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <Table2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Data Editor</h2>
            <p className="text-sm text-muted-foreground">
              Browse, filter, sort, and edit table data with inline validation
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
              Add a database server to browse and edit table data. Go to Servers to add your first connection.
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
          <Table2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Data Editor</h2>
          <p className="text-sm text-muted-foreground">
            Grid-based table editor: browse, filter, sort, and edit data with inline validation
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {selectedServer.name} / {selectedDatabase}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && selectedServer && selectedDatabase && (
        <TablesBrowser
          server={selectedServer}
          database={selectedDatabase}
          initialTableName={storeTableName}
          onTableDataOpened={() => setSelectedTableName(null)}
        />
      )}

      {selectedServerId && selectedServer && !selectedDatabase && databases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Select a database above to browse and edit table data.
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
