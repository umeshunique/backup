import { useBackupStore } from '@/store/backupStore';
import { Button } from '@/components/ui/button';
import { Database, ChevronDown, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { EnvironmentBadge } from '@/components/shared';

interface CompactContextBarProps {
  onShowConnections: () => void;
}

/**
 * One-line context bar shown when server + schema are selected on a database screen.
 * Breadcrumb: Server → Database with status; expand to change connection.
 */
export function CompactContextBar({ onShowConnections }: CompactContextBarProps) {
  const { servers, selectedServerId, selectedDatabaseName } = useBackupStore();
  const server = selectedServerId ? servers.find((s) => s.id === selectedServerId) : undefined;

  if (!server || !selectedDatabaseName) return null;

  const isConnected = server.connectionStatus === 'connected';

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500 shrink-0" aria-label="Connected" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Not connected" />
        )}
        <span className="text-sm text-muted-foreground truncate" title={`${server.name} / ${selectedDatabaseName}`}>
          <span className="font-medium text-foreground font-mono">{server.name}</span>
          <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground inline-block shrink-0" aria-hidden />
          <span className="font-mono text-foreground">{selectedDatabaseName}</span>
        </span>
        <EnvironmentBadge environment={server.environment} size="sm" className="shrink-0 hidden sm:inline-flex" />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
        onClick={onShowConnections}
        aria-label="Change server or database"
      >
        <ChevronDown className="h-4 w-4" />
        Change connection
      </Button>
    </div>
  );
}
