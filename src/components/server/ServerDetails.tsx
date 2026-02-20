import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServerConfig } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import {
  ArrowLeft,
  Settings,
  Activity,
  Database,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Clock,
  HardDrive,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ServerDetailsProps {
  server: ServerConfig;
  onBack: () => void;
  onEdit?: () => void;
}

export function ServerDetails({ server, onBack, onEdit }: ServerDetailsProps) {
  const { getDatabasesForServer, loadDatabasesForServer, testConnection, selectDatabase, setActiveTab } = useBackupStore();
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingDbs, setIsLoadingDbs] = useState(false);

  const databases = getDatabasesForServer(server.id);

  useEffect(() => {
    setIsLoadingDbs(true);
    loadDatabasesForServer(server.id).finally(() => setIsLoadingDbs(false));
  }, [server.id, loadDatabasesForServer]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    const success = await testConnection(server.id);
    setIsTesting(false);
    toast({
      title: success ? 'Connection successful' : 'Connection failed',
      description: success ? `Connected to ${server.name}.` : `Could not connect to ${server.name}. Check settings.`,
      variant: success ? 'default' : 'destructive',
    });
  };

  const handleOpenDatabase = (dbName: string) => {
    selectDatabase(dbName);
    setActiveTab('sql-editor');
  };

  const connectionIcon = () => {
    if (isTesting || server.connectionStatus === 'testing') {
      return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
    }
    if (server.connectionStatus === 'connected') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const statusText =
    server.connectionStatus === 'connected'
      ? 'Connected'
      : server.connectionStatus === 'testing'
        ? 'Testing…'
        : 'Disconnected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to server list">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{server.name}</h1>
              <Badge variant="secondary">{server.environment}</Badge>
              <Badge
                variant={server.connectionStatus === 'connected' ? 'default' : 'destructive'}
                className="gap-1.5"
              >
                {connectionIcon()}
                {statusText}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {server.host}:{server.port} • {server.databaseType}
            </p>
          </div>
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings className="h-4 w-4 mr-2" />
            Server Settings
          </Button>
        )}
      </div>

      {/* Connection & status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {server.connectionStatus === 'connected' ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : server.connectionStatus === 'testing' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">{statusText}</span>
              </div>
              {server.lastConnected && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Last connected {formatDistanceToNow(server.lastConnected, { addSuffix: true })}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Databases on this server (server-related summary only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Databases
            {isLoadingDbs && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLoadingDbs
              ? 'Loading…'
              : `${databases.length} database${databases.length !== 1 ? 's' : ''} on this server. Open one to run queries or browse objects.`}
          </p>
        </CardHeader>
        <CardContent>
          {databases.length === 0 && !isLoadingDbs ? (
            <p className="text-sm text-muted-foreground">No databases found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {databases.map((db) => (
                <Button
                  key={db.name}
                  variant="outline"
                  size="sm"
                  className="gap-2 font-mono"
                  onClick={() => handleOpenDatabase(db.name)}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  {db.name}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
