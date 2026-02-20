import { useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnvironmentBadge } from '@/components/shared';
import { MigrationWizardState } from './MigrationWizard';
import { Database, ArrowRight, Loader2 } from 'lucide-react';

interface MigrationSourceTargetStepProps {
  state: MigrationWizardState;
  onUpdate: (updates: Partial<MigrationWizardState>) => void;
}

export function MigrationSourceTargetStep({ state, onUpdate }: MigrationSourceTargetStepProps) {
  const { servers, getDatabasesForServer, loadDatabasesForServer } = useBackupStore();

  const sourceDatabases = state.sourceServerId ? getDatabasesForServer(state.sourceServerId) : [];
  const targetDatabases = state.targetServerId ? getDatabasesForServer(state.targetServerId) : [];

  useEffect(() => {
    if (state.sourceServerId) loadDatabasesForServer(state.sourceServerId);
  }, [state.sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (state.targetServerId) loadDatabasesForServer(state.targetServerId);
  }, [state.targetServerId, loadDatabasesForServer]);

  const sourceServer = servers.find((s) => s.id === state.sourceServerId);
  const targetServer = servers.find((s) => s.id === state.targetServerId);
  const sourceDb = sourceDatabases.find((d) => d.name === state.sourceDatabaseName);
  const targetDb = targetDatabases.find((d) => d.name === state.targetDatabaseName);

  const isSameEndpoint =
    state.sourceServerId &&
    state.targetServerId &&
    state.sourceDatabaseName &&
    state.targetDatabaseName &&
    state.sourceServerId === state.targetServerId &&
    state.sourceDatabaseName === state.targetDatabaseName;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose the source database to migrate from and the target server and database. Migration copies schema, data,
        and optionally users from source to target.
      </p>

      <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] items-start">
        <Card className="border-2 border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2.5">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">Source</h3>
                <p className="text-xs text-muted-foreground">Database to migrate from</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Server</Label>
              <Select
                value={state.sourceServerId ?? ''}
                onValueChange={(v) =>
                  onUpdate({
                    sourceServerId: v || null,
                    sourceDatabaseName: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <EnvironmentBadge environment={s.environment} size="sm" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Database</Label>
              <Select
                value={state.sourceDatabaseName ?? ''}
                onValueChange={(v) => onUpdate({ sourceDatabaseName: v || null })}
                disabled={!state.sourceServerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source database" />
                </SelectTrigger>
                <SelectContent>
                  {sourceDatabases.length === 0 && state.sourceServerId ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    sourceDatabases.map((db) => (
                      <SelectItem key={db.name} value={db.name}>
                        {db.name}
                        {db.tableCount != null && (
                          <span className="text-muted-foreground ml-1">({db.tableCount} tables)</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {sourceServer && sourceDb && (
              <p className="text-xs text-muted-foreground">
                {sourceServer.host}:{sourceServer.port} → {sourceDb.name}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="hidden md:flex items-center justify-center pt-10">
          <ArrowRight className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>

        <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-2.5">
                <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">Target</h3>
                <p className="text-xs text-muted-foreground">Destination server and database</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Server</Label>
              <Select
                value={state.targetServerId ?? ''}
                onValueChange={(v) =>
                  onUpdate({
                    targetServerId: v || null,
                    targetDatabaseName: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <EnvironmentBadge environment={s.environment} size="sm" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Database</Label>
              <Select
                value={state.targetDatabaseName ?? ''}
                onValueChange={(v) => onUpdate({ targetDatabaseName: v || null })}
                disabled={!state.targetServerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or create target database" />
                </SelectTrigger>
                <SelectContent>
                  {targetDatabases.length === 0 && state.targetServerId ? (
                    <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    targetDatabases.map((db) => (
                      <SelectItem key={db.name} value={db.name}>
                        {db.name}
                        {db.tableCount != null && (
                          <span className="text-muted-foreground ml-1">({db.tableCount} tables)</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {targetServer && targetDb && (
              <p className="text-xs text-muted-foreground">
                {targetServer.host}:{targetServer.port} → {targetDb.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isSameEndpoint && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Source and target are the same. Choose a different target server or database for migration.
        </div>
      )}
    </div>
  );
}
