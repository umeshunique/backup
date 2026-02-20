import { useEffect, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  LayoutList,
  Database,
  Server as ServerIcon,
  Plus,
  Table2,
  FileCode,
  Eye,
  Zap,
  Code2,
  Network,
} from 'lucide-react';
import { ServerConfig } from '@/types/backup.types';
import {
  TablesBrowser,
  ProceduresBrowser,
  ViewsBrowser,
  FunctionsBrowser,
  TriggersBrowser,
  SqlEditor,
} from '@/components/server';
import { EnhancedDataModelViewer } from '@/components/server/EnhancedDataModelViewer';
import { DatabaseExplorer } from '@/components/layout';

export type DatabaseObjectTabId =
  | 'sql-editor'
  | 'data-model'
  | 'tables'
  | 'procedures'
  | 'views'
  | 'functions'
  | 'triggers';

export function DatabaseObjectsPage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    setActiveTab,
    selectedServerId: storeServerId,
    selectedDatabaseName: storeDatabaseName,
    selectServer,
    selectDatabase,
    sqlEditorInitialSql,
    setSqlEditorInitialSql,
  } = useBackupStore();

  const [localServerId, setLocalServerId] = useState<string | null>(null);
  const [localDatabase, setLocalDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [activeObjectTab, setActiveObjectTab] = useState<DatabaseObjectTabId>('tables');

  // Use global context when set; otherwise use local selection
  const selectedServerId = storeServerId ?? localServerId;
  const selectedDatabase = storeDatabaseName ?? localDatabase;
  const usingGlobalContext = Boolean(storeServerId && storeDatabaseName);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Sync local from global when global is set
  useEffect(() => {
    if (storeServerId && servers.some((s) => s.id === storeServerId)) {
      setLocalServerId(storeServerId);
      if (storeDatabaseName) setLocalDatabase(storeDatabaseName);
    }
  }, [storeServerId, storeDatabaseName, servers]);

  useEffect(() => {
    if (!selectedServerId) {
      if (!storeServerId) setLocalDatabase(null);
      return;
    }
    if (!(storeServerId === selectedServerId && storeDatabaseName)) {
      setLoadingDatabases(true);
      loadDatabasesForServer(selectedServerId).finally(() =>
        setLoadingDatabases(false)
      );
    }
    if (!storeServerId || selectedServerId !== storeServerId) setLocalDatabase(null);
  }, [selectedServerId, loadDatabasesForServer, storeServerId, storeDatabaseName]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId
    ? getDatabasesForServer(selectedServerId)
    : [];
  const canShowObjects = selectedServer && selectedDatabase;

  const noServersContent =
    servers.length === 0 ? (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <LayoutList className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Database Objects</h2>
            <p className="text-sm text-muted-foreground">
              Browse tables, procedures, functions, views, and triggers. View
              definitions and manage objects. Use the Database Explorer on the left.
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
              Add a database server from the Database Explorer (left) or go to Servers.
            </p>
            <Button onClick={() => setActiveTab('servers')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add server
            </Button>
          </CardContent>
        </Card>
      </div>
    ) : null;

  const objectContent =
    noServersContent ?? (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2.5">
          <LayoutList className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Database Objects</h2>
          <p className="text-sm text-muted-foreground">
            SQL Editor, Data Model, tables, procedures, views, functions, and
            triggers in one place. Use the Database Explorer (left) or pick server/database below.
          </p>
        </div>
      </div>

      {usingGlobalContext ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">
            {selectedServer?.name} / {selectedDatabase}
          </span>
          <span className="text-xs">(from Connections bar)</span>
        </div>
      ) : (
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
                  const id = v || null;
                  setLocalServerId(id);
                  setLocalDatabase(null);
                  if (id) selectServer(id);
                  else selectDatabase(null);
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
                onValueChange={(v) => {
                  const db = v || null;
                  setLocalDatabase(db);
                  if (db) selectDatabase(db);
                  else selectDatabase(null);
                }}
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
      )}

      {canShowObjects && selectedServer && selectedDatabase && (
        <Tabs
          value={activeObjectTab}
          onValueChange={(v) => setActiveObjectTab(v as DatabaseObjectTabId)}
        >
          <TabsList className="grid w-full grid-cols-7 max-[1200px]:grid-cols-4 max-[900px]:grid-cols-2">
            <TabsTrigger value="sql-editor" className="gap-2">
              <Code2 className="h-4 w-4" />
              SQL Editor
            </TabsTrigger>
            <TabsTrigger value="data-model" className="gap-2">
              <Network className="h-4 w-4" />
              Data Model
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2">
              <Table2 className="h-4 w-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="procedures" className="gap-2">
              <FileCode className="h-4 w-4" />
              Procedures
            </TabsTrigger>
            <TabsTrigger value="views" className="gap-2">
              <Eye className="h-4 w-4" />
              Views
            </TabsTrigger>
            <TabsTrigger value="functions" className="gap-2">
              <Zap className="h-4 w-4" />
              Functions
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-2">
              <Zap className="h-4 w-4" />
              Triggers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sql-editor" className="mt-6">
            <SqlEditor
              server={selectedServer}
              database={selectedDatabase}
              initialSql={sqlEditorInitialSql}
              onInitialSqlConsumed={() => setSqlEditorInitialSql(null)}
            />
          </TabsContent>
          <TabsContent value="data-model" className="mt-6">
            <EnhancedDataModelViewer
              server={selectedServer}
              database={selectedDatabase}
            />
          </TabsContent>
          <TabsContent value="tables" className="mt-6">
            <TablesBrowser server={selectedServer} database={selectedDatabase} />
          </TabsContent>
          <TabsContent value="procedures" className="mt-6">
            <ProceduresBrowser
              server={selectedServer}
              database={selectedDatabase}
            />
          </TabsContent>
          <TabsContent value="views" className="mt-6">
            <ViewsBrowser
              server={selectedServer}
              database={selectedDatabase}
            />
          </TabsContent>
          <TabsContent value="functions" className="mt-6">
            <FunctionsBrowser
              server={selectedServer}
              database={selectedDatabase}
            />
          </TabsContent>
          <TabsContent value="triggers" className="mt-6">
            <TriggersBrowser
              server={selectedServer}
              database={selectedDatabase}
            />
          </TabsContent>
        </Tabs>
      )}

      {selectedServerId && selectedServer && !selectedDatabase && databases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Select a database above to browse tables, procedures, views,
            functions, and triggers.
          </CardContent>
        </Card>
      )}

      {selectedServerId &&
        selectedServer &&
        databases.length === 0 &&
        !loadingDatabases && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No databases found on this server, or still loading. Try another
              server.
            </CardContent>
          </Card>
        )}
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      <div className="shrink-0 overflow-hidden flex flex-col min-h-0">
        <DatabaseExplorer />
      </div>
      <div className="flex-1 min-w-0 overflow-auto p-6">
        {objectContent}
      </div>
    </div>
  );
}
