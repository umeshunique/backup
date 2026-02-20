import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServerDetails } from './ServerDetails';
import { ServerConfigWizard } from './ServerConfigWizard';
import { ServerConfig } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { Server, Plus, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Servers page: no duplicate list. Connections are only in the bar above.
 * - When a connection is selected above: show details for that server only.
 * - When none selected: show "Add New Server" only (select a connection above to manage).
 */
export function ServersPage() {
  const {
    servers,
    selectedServerId,
    selectServer,
    getServerById,
    loadServers,
    addServer,
    updateServer,
  } = useBackupStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const selectedServer = selectedServerId ? getServerById(selectedServerId) : null;

  const handleSave = async (data: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingServer) {
        await updateServer(editingServer.id, data);
        toast({
          title: 'Server Updated',
          description: 'The server configuration has been updated.',
        });
      } else {
        await addServer(data);
        toast({
          title: 'Server Added',
          description: 'New server configuration has been added.',
        });
      }
      setIsDialogOpen(false);
      setEditingServer(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save server. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingServer(null);
  };

  // Selected connection from bar: show only that server's details
  if (selectedServerId && selectedServer) {
    return (
      <>
        <ServerDetails
          server={selectedServer}
          onBack={() => selectServer(null)}
          onEdit={() => {
            setEditingServer(selectedServer);
            setIsDialogOpen(true);
          }}
        />
        <ServerConfigWizard
          open={isDialogOpen}
          onOpenChange={(open) => !open && handleDialogClose()}
          server={editingServer}
          onSave={handleSave}
        />
      </>
    );
  }

  // No connection selected: show list of servers or empty state (title/description from PageShell)
  const openAddServer = () => {
    setEditingServer(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openAddServer} size="lg" className="shadow-sm">
          <Plus className="h-5 w-5 mr-2" />
          Add Server
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card className="overflow-hidden border border-primary/20 bg-card/50 max-w-xl shadow-lg ring-1 ring-primary/10">
          <CardContent className="relative p-10 flex flex-col items-center justify-center text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-5 ring-1 ring-primary/20">
              <Server className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="relative text-xl font-semibold tracking-tight text-foreground">No servers yet</h2>
            <p className="relative text-sm text-muted-foreground mt-1.5 max-w-sm">
              Add your first database connection to manage backups, run queries, and explore schemas.
            </p>
            <Button onClick={openAddServer} size="lg" className="relative mt-6 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => {
            const isSelected = selectedServerId === server.id;
            return (
              <Card
                key={server.id}
                className={`cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:bg-card/80 group ${
                  isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md' : ''
                }`}
                onClick={() => selectServer(server.id)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-muted/80 flex items-center justify-center shrink-0 ring-1 ring-border/50">
                    <Server className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium truncate text-foreground">{server.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {server.host}:{server.port}
                    </p>
                    <p className="text-xs text-muted-foreground">{server.databaseType}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingServer(server);
                      setIsDialogOpen(true);
                    }}
                    aria-label="Edit server"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ServerConfigWizard
        open={isDialogOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
        server={editingServer}
        onSave={handleSave}
      />
    </div>
  );
}
