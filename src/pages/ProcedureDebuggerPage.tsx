import { useEffect, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { StoredProcedureDebugger } from '@/components/procedure-debugger';
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
import { Bug, Database, Server as ServerIcon, Plus } from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';
import { StoredProcedure } from '@/types/backup.types';

export function ProcedureDebuggerPage() {
  const {
    servers,
    databaseSchemas,
    loadServers,
    loadDatabasesForServer,
    loadDatabaseSchema,
    getDatabasesForServer,
    setActiveTab,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);

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
  const selectedDbSchema = selectedServerId && selectedDatabase
    ? (databaseSchemas[selectedServerId] || []).find(
        (s) => s.name === selectedDatabase
      )
    : null;
  const procedures: StoredProcedure[] = selectedDbSchema?.procedures ?? [];

  const handleLoadProcedure = (_name?: string) => {
    if (!selectedServerId || !selectedDatabase) return;
    setLoadingSchema(true);
    loadDatabaseSchema(selectedServerId, selectedDatabase).finally(() => setLoadingSchema(false));
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Bug className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Stored Procedure Debugger</h2>
            <p className="text-sm text-muted-foreground">
              Debug stored procedures with breakpoints, step execution, and variable inspection
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
              Add a database server to use the procedure debugger. Go to Servers to add your first connection.
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
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Bug className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Stored Procedure Debugger</h2>
          <p className="text-sm text-muted-foreground">
            Set breakpoints, step through execution, inspect variables and call stack
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

      {selectedServer && selectedDatabase && (
        <StoredProcedureDebugger
          server={selectedServer}
          database={selectedDatabase}
          procedures={procedures}
          onLoadProcedure={handleLoadProcedure}
          onRefreshProcedures={handleLoadProcedure}
          isRefreshing={loadingSchema}
        />
      )}

      {selectedServerId && selectedServer && !selectedDatabase && databases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Select a database above to browse and debug stored procedures.
          </CardContent>
        </Card>
      )}

      {selectedServerId && selectedServer && databases.length === 0 && !loadingDatabases && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No databases found on this server. Try another server.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
