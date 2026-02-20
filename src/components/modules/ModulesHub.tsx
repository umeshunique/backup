import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Server,
  Database,
  Wifi,
  WifiOff,
  Terminal,
  Archive,
  Table2,
  GitBranch,
  BarChart2,
  Settings,
  ChevronRight,
  Plus,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { EnvironmentBadge } from '@/components/shared';
import { ServerConfigWizard } from '@/components/server/ServerConfigWizard';
import { toast } from '@/hooks/use-toast';

/** Quick links: open another tab with current server already selected */
const QUICK_LINKS: { tabId: string; label: string; icon: typeof Terminal }[] = [
  { tabId: 'sql-editor', label: 'SQL Editor', icon: Terminal },
  { tabId: 'backup', label: 'Backup', icon: Archive },
  { tabId: 'data-editor', label: 'Data Editor', icon: Table2 },
  { tabId: 'compare', label: 'Schema Compare', icon: GitBranch },
  { tabId: 'monitoring', label: 'Monitoring', icon: BarChart2 },
  { tabId: 'servers', label: 'Manage Servers', icon: Settings },
];

export function ModulesHub() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    selectServer,
    selectedServerId,
    setActiveTab,
    addServer,
  } = useBackupStore();

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const selectedId = localSelectedId ?? selectedServerId ?? (servers[0]?.id ?? null);
  const selectedServer = servers.find((s) => s.id === selectedId);
  const serverDatabases = selectedId ? getDatabasesForServer(selectedId) : [];

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (selectedId) {
      loadDatabasesForServer(selectedId);
      selectServer(selectedId);
    }
  }, [selectedId, loadDatabasesForServer, selectServer]);

  const handleSelectServer = (serverId: string) => {
    setLocalSelectedId(serverId);
    selectServer(serverId);
  };

  const handleOpenTab = (tabId: string) => {
    setActiveTab(tabId as Parameters<typeof setActiveTab>[0]);
  };

  const handleAddServerSave = async (data: Parameters<typeof addServer>[0]) => {
    try {
      await addServer(data);
      toast({ title: 'Server Added', description: 'New server configuration has been added.' });
      setIsAddServerOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add server.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-0">
      {/* Servers row — click to select; Add Server always available */}
      <Card className="shrink-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Servers
            </h2>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddServerOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Server
            </Button>
          </div>
          {servers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No servers configured. Click &quot;Add Server&quot; above or{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenTab('servers')}>
                open Servers
              </Button>{' '}
              to add your first connection.
            </p>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {servers.map((server) => {
                  const isSelected = selectedId === server.id;
                  return (
                    <Button
                      key={server.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSelectServer(server.id)}
                      className={cn(
                        'flex items-center gap-2 shrink-0',
                        isSelected && 'ring-2 ring-primary ring-offset-2'
                      )}
                      aria-pressed={isSelected}
                    >
                      {server.connectionStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[140px]">{server.name}</span>
                      <EnvironmentBadge environment={server.environment} size="sm" />
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Below: selected server — same details as Servers page (ServerDetails) */}
      {selectedServer && (
        <Card className="flex-1 min-h-0 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/15 p-3">
                  <Server className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight">{selectedServer.name}</h3>
                    <EnvironmentBadge environment={selectedServer.environment} />
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        selectedServer.connectionStatus === 'connected'
                          ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Activity className="h-3 w-3" />
                      {selectedServer.connectionStatus || 'unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {selectedServer.host}:{selectedServer.port} · {selectedServer.databaseType}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedServer.username}
                    {serverDatabases.length > 0 && (
                      <> · {serverDatabases.length} database{serverDatabases.length !== 1 ? 's' : ''}</>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenTab('servers')}
                className="gap-2 shrink-0"
              >
                <Settings className="h-4 w-4" />
                Manage server
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </div>

            {/* Quick links — open in another tab */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Open tool</h4>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map(({ tabId, label, icon: Icon }) => (
                  <Button
                    key={tabId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenTab(tabId)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Database list */}
            {serverDatabases.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Databases</h4>
                <div className="flex flex-wrap gap-2">
                  {serverDatabases.map((db) => (
                    <span
                      key={db.name}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm"
                    >
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      {db.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Optional: link to full modules list via sidebar (no extra UI) — user said other tab open is fine */}
      {selectedServer && (
        <p className="text-xs text-muted-foreground">
          Use the sidebar to open SQL Editor, Backup, Data Editor, and other modules. Selecting a server here keeps it selected there too. Use &quot;Manage server&quot; for full details and edit.
        </p>
      )}

      <ServerConfigWizard
        open={isAddServerOpen}
        onOpenChange={setIsAddServerOpen}
        server={null}
        onSave={handleAddServerSave}
      />
    </div>
  );
}
