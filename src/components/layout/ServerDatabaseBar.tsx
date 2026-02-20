import { useEffect, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnvironmentBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import {
  Server,
  Database,
  Plus,
  Filter,
  Wifi,
  WifiOff,
  Loader2,
  ChevronRight,
  Check,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
} from 'lucide-react';

function ConnectionSkeleton() {
  return (
    <div className="flex gap-2 pb-2" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[160px] h-[72px] rounded-lg border border-border bg-muted/40 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

interface ServerDatabaseBarProps {
  /** When set, show a "Done" button to collapse back to compact context (used when expanded from compact bar). */
  onCollapse?: () => void;
  /** When set, "Add server" opens this callback (e.g. to open Add Server dialog) instead of switching to Servers tab. */
  onAddServerClick?: () => void;
  /** When set, "Edit server" is shown for the selected connection and this callback is invoked to open the edit dialog. */
  onEditServerClick?: () => void;
}

/**
 * Connections load on mount. Databases load when user clicks a connection.
 */
export function ServerDatabaseBar({ onCollapse, onAddServerClick, onEditServerClick }: ServerDatabaseBarProps) {
  const {
    servers,
    selectedServerId,
    selectedDatabaseName,
    selectServer,
    selectDatabase,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    createDatabase,
    dropDatabase,
    setActiveTab,
  } = useBackupStore();

  const [loadingConnections, setLoadingConnections] = useState(false);
  const [filterConnections, setFilterConnections] = useState('');
  const [filterDatabases, setFilterDatabases] = useState('');
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  const [createDbOpen, setCreateDbOpen] = useState(false);
  const [createDbName, setCreateDbName] = useState('');
  const [createDbError, setCreateDbError] = useState<string | null>(null);
  const [createDbLoading, setCreateDbLoading] = useState(false);
  const [dropDbOpen, setDropDbOpen] = useState(false);
  const [dropDbConfirmName, setDropDbConfirmName] = useState('');
  const [dropDbError, setDropDbError] = useState<string | null>(null);
  const [dropDbLoading, setDropDbLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingConnections(true);
    loadServers().then(async () => {
      if (cancelled) return;
      setLoadingConnections(false);
      // Restore last server/database from localStorage (multi-session)
      try {
        const raw = localStorage.getItem('backup-app-connection');
        if (!raw) return;
        const { lastServerId, lastDatabaseName } = JSON.parse(raw) as { lastServerId?: string; lastDatabaseName?: string };
        const currentServers = useBackupStore.getState().servers;
        if (!lastServerId || !currentServers.find((s) => s.id === lastServerId)) return;
        selectServer(lastServerId);
        setLoadingDbs(true);
        await loadDatabasesForServer(lastServerId);
        if (cancelled) return;
        setLoadingDbs(false);
        const dbs = useBackupStore.getState().databaseSchemas[lastServerId] || [];
        if (lastDatabaseName && dbs.some((d) => d.name === lastDatabaseName)) {
          selectDatabase(lastDatabaseName);
        }
      } catch {
        // ignore
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const handleSelectServer = async (serverId: string) => {
    selectServer(serverId);
    setLoadingDbs(true);
    await loadDatabasesForServer(serverId);
    setLoadingDbs(false);
  };

  const openCreateDatabase = () => {
    setCreateDbName('');
    setCreateDbError(null);
    setCreateDbOpen(true);
  };

  const handleCreateDatabase = async () => {
    const name = createDbName.trim();
    if (!name) {
      setCreateDbError('Enter a database name.');
      return;
    }
    if (!/^[a-zA-Z0-9_$]+$/.test(name)) {
      setCreateDbError('Use only letters, numbers, underscore, or dollar sign.');
      return;
    }
    if (!selectedServerId) {
      setCreateDbError('Select a connection first.');
      return;
    }
    setCreateDbError(null);
    setCreateDbLoading(true);
    try {
      await createDatabase(selectedServerId, name);
      setCreateDbOpen(false);
      setLoadingDbs(true);
      await loadDatabasesForServer(selectedServerId);
      setLoadingDbs(false);
    } catch (err) {
      setCreateDbError(err instanceof Error ? err.message : 'Failed to create database.');
    } finally {
      setCreateDbLoading(false);
    }
  };

  const openDropDatabase = () => {
    if (!selectedServerId || !selectedDatabaseName) return;
    setDropDbConfirmName('');
    setDropDbError(null);
    setDropDbOpen(true);
  };

  const handleDropDatabase = async () => {
    if (!selectedServerId || !selectedDatabaseName) return;
    if (dropDbConfirmName !== selectedDatabaseName) {
      setDropDbError(`Type "${selectedDatabaseName}" to confirm.`);
      return;
    }
    setDropDbError(null);
    setDropDbLoading(true);
    try {
      await dropDatabase(selectedServerId, selectedDatabaseName);
      setDropDbOpen(false);
      selectDatabase('');
      setLoadingDbs(true);
      await loadDatabasesForServer(selectedServerId);
      setLoadingDbs(false);
    } catch (err) {
      setDropDbError(err instanceof Error ? err.message : 'Failed to drop database.');
    } finally {
      setDropDbLoading(false);
    }
  };

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const filteredServers = filterConnections.trim()
    ? servers.filter(
        (s) =>
          s.name.toLowerCase().includes(filterConnections.toLowerCase()) ||
          s.host.toLowerCase().includes(filterConnections.toLowerCase())
      )
    : servers;
  const filteredDatabases = filterDatabases.trim()
    ? databases.filter((d) => d.name.toLowerCase().includes(filterDatabases.toLowerCase()))
    : databases;

  // Compact top line: Server + Database dropdowns (always visible)
  const dropdownRow = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 border-b border-border bg-muted/20 min-h-[52px]">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <Select
          value={selectedServerId ?? ''}
          onValueChange={(id) => id && handleSelectServer(id)}
          disabled={loadingConnections || servers.length === 0}
        >
          <SelectTrigger
            className={cn(
              'h-9 min-w-[140px] max-w-[220px] sm:min-w-[180px] font-mono text-sm bg-background border-border',
              !selectedServerId && 'text-muted-foreground'
            )}
            aria-label="Select server"
          >
            <span className="flex items-center gap-2 truncate">
              {selectedServer && (
                <>
                  {selectedServer.connectionStatus === 'connected' ? (
                    <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden />
                  ) : selectedServer.connectionStatus === 'testing' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  )}
                </>
              )}
              <SelectValue placeholder={servers.length === 0 ? 'Add server first' : 'Select server…'} />
            </span>
          </SelectTrigger>
          <SelectContent align="start" className="max-h-[280px]">
            {loadingConnections ? (
              <div className="flex items-center gap-2 py-4 px-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                {servers.length === 0 ? 'No servers. Add one first.' : 'No match.'}
              </div>
            ) : (
              filteredServers.map((server) => (
                <SelectItem key={server.id} value={server.id} className="font-mono">
                  <span className="flex items-center gap-2">
                    {server.connectionStatus === 'connected' ? (
                      <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : server.connectionStatus === 'testing' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{server.name}</span>
                    <EnvironmentBadge environment={server.environment} size="sm" className="shrink-0" />
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" aria-hidden />

        <Select
          value={selectedDatabaseName ?? ''}
          onValueChange={(name) => name && selectDatabase(name)}
          disabled={!selectedServerId || loadingDbs || databases.length === 0}
        >
          <SelectTrigger
            className={cn(
              'h-9 min-w-[120px] max-w-[200px] sm:min-w-[160px] font-mono text-sm bg-background border-border',
              !selectedDatabaseName && 'text-muted-foreground'
            )}
            aria-label="Select database"
          >
            <SelectValue
              placeholder={
                !selectedServerId
                  ? 'Pick server first'
                  : loadingDbs
                    ? 'Loading…'
                    : databases.length === 0
                      ? 'No databases'
                      : 'Select database…'
              }
            />
          </SelectTrigger>
          <SelectContent align="start" className="max-h-[280px]">
            {filteredDatabases.length === 0 ? (
              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                {loadingDbs ? 'Loading…' : databases.length === 0 ? 'No databases' : 'No match.'}
              </div>
            ) : (
              filteredDatabases.map((db) => (
                <SelectItem key={db.name} value={db.name} className="font-mono">
                  <span className="flex items-center justify-between gap-2 w-full">
                    <span className="truncate">{db.name}</span>
                    {db.tableCount != null && db.tableCount > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">{db.tableCount} tables</span>
                    )}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onCollapse ? (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onCollapse}
            aria-label="Done, use current connection"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="hidden sm:inline">Done</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowExpanded((v) => !v)}
            aria-label={showExpanded ? 'Hide connection list' : 'Show full connection list'}
          >
            {showExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{showExpanded ? 'Hide list' : 'Show list'}</span>
          </Button>
        )}
        {selectedServerId && onEditServerClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditServerClick();
            }}
            aria-label="Edit selected server"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit server</span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddServerClick ? onAddServerClick() : setActiveTab('servers');
          }}
          aria-label="Add or manage servers"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add server</span>
        </Button>
      </div>
    </div>
  );

  // Expanded section: full connection cards + schema list (optional)
  const expandedSection = (
    <div className="border-t border-border bg-muted/30">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-muted-foreground font-normal">1.</span> Connections
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Filter className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Filter"
                value={filterConnections}
                onChange={(e) => setFilterConnections(e.target.value)}
                className="pl-8 h-8 w-32 text-sm bg-background border-border"
                aria-label="Filter connections"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {loadingConnections ? (
              <ConnectionSkeleton />
            ) : filteredServers.length === 0 ? (
              servers.length === 0 ? (
                <div className="flex items-center gap-4 py-4 px-4 rounded-lg border border-dashed border-border bg-muted/20 min-w-0 max-w-md">
                  <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                    <Server className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">No connections yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add your first server to connect to databases and run tools.
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="mt-2 gap-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddServerClick ? onAddServerClick() : setActiveTab('servers');
                      }}
                      aria-label="Add server"
                    >
                      <Plus className="h-4 w-4" />
                      Add server
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No connections match filter.</p>
              )
            ) : (
              filteredServers.map((server) => {
                const isSelected = selectedServerId === server.id;
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => handleSelectServer(server.id)}
                    className={cn(
                      'shrink-0 flex flex-col items-start gap-0.5 rounded-lg border-2 px-4 py-3 min-w-[160px] max-w-[200px] text-left transition-colors',
                      'hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-background/60 hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium text-sm truncate">{server.name}</span>
                      {server.connectionStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden />
                      ) : server.connectionStatus === 'testing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" aria-hidden />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full" title={`${server.username} @ ${server.host}:${server.port}`}>
                      {server.username} · {server.host.length > 20 ? `${server.host.slice(0, 18)}…` : server.host}
                    </span>
                    <EnvironmentBadge environment={server.environment} size="sm" className="mt-1" />
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedServer && (
        <div className="border-t border-border bg-background/50 px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="font-normal">2.</span>
              <Database className="h-3.5 w-3.5" />
              Schemas
              {loadingDbs && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={openCreateDatabase}
                aria-label="Add database"
              >
                <Plus className="h-3 w-3" />
                Add database
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                disabled={!selectedDatabaseName}
                onClick={openDropDatabase}
                aria-label="Drop database"
              >
                <Trash2 className="h-3 w-3" />
                Drop
              </Button>
              <div className="relative flex items-center">
                <Input
                  type="search"
                  placeholder="Filter databases"
                  value={filterDatabases}
                  onChange={(e) => setFilterDatabases(e.target.value)}
                  className="h-7 w-36 text-xs pl-7 bg-muted/50 border-0"
                  aria-label="Filter databases"
                />
                <Filter className="absolute left-2 h-3 w-3 text-muted-foreground" aria-hidden />
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-[180px]">
            <ul className="space-y-0.5 pr-2">
              {filteredDatabases.length === 0 ? (
                <li className="text-xs text-muted-foreground py-2">
                  {loadingDbs ? 'Loading…' : databases.length === 0 ? 'No databases' : 'No databases match filter.'}
                </li>
              ) : (
                filteredDatabases.map((db) => {
                  const isSelected = selectedDatabaseName === db.name;
                  return (
                    <li key={db.name}>
                      <button
                        type="button"
                        onClick={() => selectDatabase(db.name)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                          isSelected ? 'bg-primary/15 text-primary font-medium' : 'text-foreground'
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className="truncate font-mono">{db.name}</span>
                        {db.tableCount != null && db.tableCount > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">{db.tableCount} tables</span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  const showFullList = Boolean(onCollapse || showExpanded);

  return (
    <div className="shrink-0 border-b border-border bg-muted/30">
      {dropdownRow}
      {showFullList ? expandedSection : null}

      <Dialog open={createDbOpen} onOpenChange={setCreateDbOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create database</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="create-db-name">Database name</Label>
              <Input
                id="create-db-name"
                value={createDbName}
                onChange={(e) => setCreateDbName(e.target.value)}
                placeholder="my_database"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDatabase()}
              />
              {createDbError && (
                <p className="text-sm text-destructive">{createDbError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDbOpen(false)}
              disabled={createDbLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateDatabase} disabled={createDbLoading}>
              {createDbLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dropDbOpen} onOpenChange={(open) => { setDropDbOpen(open); if (!open) setDropDbError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Drop database</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {selectedDatabaseName && (
              <>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the database{' '}
                  <strong className="font-mono text-foreground">{selectedDatabaseName}</strong> and all its data. This
                  cannot be undone.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="drop-db-confirm">
                    Type <span className="font-mono">{selectedDatabaseName}</span> to confirm
                  </Label>
                  <Input
                    id="drop-db-confirm"
                    value={dropDbConfirmName}
                    onChange={(e) => setDropDbConfirmName(e.target.value)}
                    placeholder={selectedDatabaseName}
                    className="font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleDropDatabase()}
                  />
                  {dropDbError && <p className="text-sm text-destructive">{dropDbError}</p>}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropDbOpen(false)} disabled={dropDbLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDropDatabase}
              disabled={dropDbLoading || !selectedDatabaseName || dropDbConfirmName !== selectedDatabaseName}
            >
              {dropDbLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Dropping…
                </>
              ) : (
                'Drop database'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
