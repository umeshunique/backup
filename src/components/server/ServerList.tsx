import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnvironmentBadge } from '@/components/shared';
import { ServerConfig } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import {
  Database,
  MoreVertical,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ServerConfigDialog } from './ServerConfigDialog';
import { toast } from '@/hooks/use-toast';

interface ServerCardProps {
  server: ServerConfig;
  onEdit: (server: ServerConfig) => void;
  onDelete: (id: string) => void;
  onClick?: (server: ServerConfig) => void;
}

function ServerCard({ server, onEdit, onDelete, onClick }: ServerCardProps) {
  const { testConnection, getDatabasesForServer } = useBackupStore();
  const [isTesting, setIsTesting] = useState(false);
  const databases = getDatabasesForServer(server.id);

  const handleTestConnection = async () => {
    setIsTesting(true);
    const success = await testConnection(server.id);
    setIsTesting(false);
    toast({
      title: success ? 'Connection Successful' : 'Connection Failed',
      description: success
        ? `Connected to ${server.name} successfully.`
        : `Failed to connect to ${server.name}. Please check your settings.`,
      variant: success ? 'default' : 'destructive',
    });
  };

  const connectionIcon = () => {
    if (isTesting || server.connectionStatus === 'testing') {
      return <Loader2 className="h-3 w-3 animate-spin text-amber-400" />;
    }
    if (server.connectionStatus === 'connected') {
      return <Wifi className="h-3 w-3 text-green-400" />;
    }
    return <WifiOff className="h-3 w-3 text-red-400" />;
  };

  return (
    <Card className="card-hover group cursor-pointer" onClick={() => onClick?.(server)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{server.name}</h3>
                {connectionIcon()}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {server.host}:{server.port}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <EnvironmentBadge environment={server.environment} size="sm" />
                <Badge variant="outline" className="text-[10px] uppercase">
                  {server.databaseType}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(server)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTestConnection} disabled={isTesting}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isTesting && 'animate-spin')} />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(server.id)}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{databases.length} database(s)</span>
          {server.lastConnected && (
            <span>Last connected: {format(server.lastConnected, 'MMM d, HH:mm')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ServerListProps {
  onServerClick?: (server: ServerConfig) => void;
}

export function ServerList({ onServerClick }: ServerListProps = {}) {
  const { servers, addServer, updateServer, deleteServer } = useBackupStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);

  const handleEdit = (server: ServerConfig) => {
    setEditingServer(server);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteServer(id);
    toast({
      title: 'Server Deleted',
      description: 'The server configuration has been removed.',
    });
  };

  const handleSave = (data: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingServer) {
      updateServer(editingServer.id, data);
      toast({
        title: 'Server Updated',
        description: 'The server configuration has been updated.',
      });
    } else {
      addServer(data);
      toast({
        title: 'Server Added',
        description: 'New server configuration has been added.',
      });
    }
    setIsDialogOpen(false);
    setEditingServer(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingServer(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Server Configurations</h2>
          <p className="text-sm text-muted-foreground">
            Manage your database server connections
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClick={onServerClick}
          />
        ))}
      </div>

      <ServerConfigDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        server={editingServer}
        onSave={handleSave}
      />
    </div>
  );
}
