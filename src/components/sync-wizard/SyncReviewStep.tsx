import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackupStore } from '@/store/backupStore';
import { EnvironmentBadge } from '@/components/shared';
import { SyncWizardState } from './SyncWizard';
import {
  Database,
  ArrowRight,
  Layers,
  Table2,
  RefreshCw,
  GitMerge,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncReviewStepProps {
  state: SyncWizardState;
}

const syncTypeLabels: Record<SyncWizardState['syncType'], string> = {
  schema: 'Schema only',
  data: 'Data only',
  both: 'Schema and data',
};

const conflictLabels: Record<SyncWizardState['conflictResolution'], string> = {
  source_wins: 'Source wins',
  target_wins: 'Target wins',
  newest_wins: 'Newest wins',
  manual: 'Manual resolution',
};

export function SyncReviewStep({ state }: SyncReviewStepProps) {
  const { servers, getServerById } = useBackupStore();
  const sourceServer = state.sourceServerId ? getServerById(state.sourceServerId) : null;
  const targetServer = state.targetServerId ? getServerById(state.targetServerId) : null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your sync configuration. Running sync will reconcile both endpoints according to the options below.
      </p>

      {/* Endpoints */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Endpoints
          </h3>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-blue-500/20 p-2.5 shrink-0">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{state.sourceDatabaseName ?? '—'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {sourceServer ? (
                    <>
                      {sourceServer.name}
                      <EnvironmentBadge environment={sourceServer.environment} size="sm" className="ml-1.5 inline-flex" />
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-violet-500/20 p-2.5 shrink-0">
                <Database className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{state.targetDatabaseName ?? '—'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {targetServer ? (
                    <>
                      {targetServer.name}
                      <EnvironmentBadge environment={targetServer.environment} size="sm" className="ml-1.5 inline-flex" />
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            {state.syncType === 'both' ? (
              <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            ) : state.syncType === 'schema' ? (
              <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            ) : (
              <Table2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sync type</p>
              <p className="font-medium mt-0.5">{syncTypeLabels[state.syncType]}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <GitMerge className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conflict resolution</p>
              <p className="font-medium mt-0.5">{conflictLabels[state.conflictResolution]}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rollback</p>
              <p className="font-medium mt-0.5 flex items-center gap-2">
                {state.enableRollback ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Enabled
                  </>
                ) : (
                  'Disabled'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ready message */}
      <div
        className={cn(
          'rounded-lg border p-4 flex items-center gap-3',
          'border-primary/30 bg-primary/5'
        )}
      >
        <div className="rounded-full bg-primary/20 p-2">
          <CheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Ready to sync</p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Start sync&quot; to run bidirectional sync. If rollback is enabled, a snapshot will be created first.
          </p>
        </div>
      </div>
    </div>
  );
}
