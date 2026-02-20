import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogViewer } from '@/components/shared';
import { SyncWizardState } from './SyncWizard';
import { useBackupStore } from '@/store/backupStore';
import { ExecutionLog } from '@/types/backup.types';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncExecutionProps {
  state: SyncWizardState;
  onComplete: () => void;
}

type Phase = 'initializing' | 'rollback_snapshot' | 'comparing' | 'syncing' | 'completed' | 'failed';

export function SyncExecution({ state, onComplete }: SyncExecutionProps) {
  const { getServerById } = useBackupStore();
  const [phase, setPhase] = useState<Phase>('initializing');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sourceServer = state.sourceServerId ? getServerById(state.sourceServerId) : null;
  const targetServer = state.targetServerId ? getServerById(state.targetServerId) : null;

  const addLog = (level: 'info' | 'warning' | 'error', message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        message,
      },
    ]);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      addLog('info', `Sync: ${state.sourceDatabaseName} ↔ ${state.targetDatabaseName}`);
      addLog('info', `Sync type: ${state.syncType}, Conflict: ${state.conflictResolution}, Rollback: ${state.enableRollback ? 'yes' : 'no'}`);

      if (!sourceServer || !targetServer || !state.sourceDatabaseName || !state.targetDatabaseName) {
        addLog('error', 'Source or target not configured.');
        setPhase('failed');
        setErrorMessage('Missing source or target.');
        return;
      }

      setPhase('initializing');
      setProgress(5);
      await new Promise((r) => setTimeout(r, 600));

      if (cancelled) return;

      if (state.enableRollback) {
        setPhase('rollback_snapshot');
        addLog('info', 'Creating rollback snapshot on target...');
        setProgress(15);
        await new Promise((r) => setTimeout(r, 800));
      }

      if (cancelled) return;

      setPhase('comparing');
      addLog('info', 'Comparing schema and data...');
      setProgress(25);
      await new Promise((r) => setTimeout(r, 1000));

      if (cancelled) return;

      setPhase('syncing');
      addLog('info', 'Applying changes (bidirectional)...');
      for (let p = 30; p <= 90; p += 10) {
        if (cancelled) return;
        setProgress(p);
        addLog('info', `Sync progress: ${p}%`);
        await new Promise((r) => setTimeout(r, 400));
      }

      if (cancelled) return;

      setProgress(100);
      setPhase('completed');
      addLog('info', 'Sync completed successfully.');
    };

    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = phase === 'completed' || phase === 'failed';
  const phaseLabel =
    phase === 'initializing'
      ? 'Initializing'
      : phase === 'rollback_snapshot'
        ? 'Rollback snapshot'
        : phase === 'comparing'
          ? 'Comparing'
          : phase === 'syncing'
            ? 'Syncing'
            : phase === 'completed'
              ? 'Completed'
              : 'Failed';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sync in progress
            </CardTitle>
            <Badge
              variant={phase === 'failed' ? 'destructive' : phase === 'completed' ? 'default' : 'secondary'}
              className={cn(
                phase === 'completed' && 'bg-green-600 hover:bg-green-600'
              )}
            >
              {phaseLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              {state.sourceDatabaseName} ↔ {state.targetDatabaseName}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isDone && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{phaseLabel}…</p>
            </div>
          )}

          {phase === 'completed' && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">Sync completed</p>
                <p className="text-sm text-muted-foreground">
                  {state.sourceDatabaseName} and {state.targetDatabaseName} are now in sync.
                  {state.enableRollback && ' Rollback snapshot was created.'}
                </p>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Sync failed</p>
                <p className="text-sm text-muted-foreground">{errorMessage ?? 'An error occurred.'}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Log</p>
            <LogViewer logs={logs} maxHeight={200} />
          </div>

          {isDone && (
            <div className="flex justify-end pt-2">
              <Button onClick={onComplete} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to wizard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
