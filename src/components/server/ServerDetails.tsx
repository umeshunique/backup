import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServerConfig } from '@/types/backup.types';
import {
  Database,
  Table2,
  FileCode,
  Eye,
  Zap,
  Code2,
  ArrowLeft,
  Settings,
  Activity,
  Network
} from 'lucide-react';
import { SqlEditor } from './SqlEditor';
import { TablesBrowser } from './TablesBrowser';
import { ProceduresBrowser } from './ProceduresBrowser';
import { ViewsBrowser } from './ViewsBrowser';
import { FunctionsBrowser } from './FunctionsBrowser';
import { TriggersBrowser } from './TriggersBrowser';
import { EnhancedDataModelViewer } from './EnhancedDataModelViewer';
import { useBackupStore } from '@/store/backupStore';

interface ServerDetailsProps {
  server: ServerConfig;
  onBack: () => void;
}

export function ServerDetails({ server, onBack }: ServerDetailsProps) {
  const { getDatabasesForServer, loadDatabasesForServer } = useBackupStore();
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sql' | 'datamodel' | 'tables' | 'procedures' | 'views' | 'functions' | 'triggers'>('sql');

  const databases = getDatabasesForServer(server.id);

  useEffect(() => {
    loadDatabasesForServer(server.id);
  }, [server.id, loadDatabasesForServer]);

  // Auto-select first database
  useEffect(() => {
    if (databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(databases[0].name);
    }
  }, [databases, selectedDatabase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <Badge variant={server.connectionStatus === 'connected' ? 'default' : 'secondary'}>
                {server.environment}
              </Badge>
              <Badge variant={server.connectionStatus === 'connected' ? 'default' : 'destructive'}>
                <Activity className="h-3 w-3 mr-1" />
                {server.connectionStatus || 'unknown'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {server.host}:{server.port} • {server.databaseType}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Server Settings
        </Button>
      </div>

      {/* Database Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {databases.map((db) => (
              <Button
                key={db.name}
                variant={selectedDatabase === db.name ? 'default' : 'outline'}
                onClick={() => setSelectedDatabase(db.name)}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                {db.name}
              </Button>
            ))}
            {databases.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading databases...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      {selectedDatabase && (
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="sql" className="gap-2">
              <Code2 className="h-4 w-4" />
              SQL Editor
            </TabsTrigger>
            <TabsTrigger value="datamodel" className="gap-2">
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

          <TabsContent value="sql" className="mt-6">
            <SqlEditor server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="datamodel" className="mt-6">
            <EnhancedDataModelViewer server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="tables" className="mt-6">
            <TablesBrowser server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="procedures" className="mt-6">
            <ProceduresBrowser server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="views" className="mt-6">
            <ViewsBrowser server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="functions" className="mt-6">
            <FunctionsBrowser server={server} database={selectedDatabase} />
          </TabsContent>

          <TabsContent value="triggers" className="mt-6">
            <TriggersBrowser server={server} database={selectedDatabase} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
