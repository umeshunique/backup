import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogViewer } from '@/components/shared';
import { MigrationWizardState } from './MigrationWizard';
import { useBackupStore } from '@/store/backupStore';
import { ExecutionLog } from '@/types/backup.types';
import { CheckCircle, XCircle, Truck, ArrowLeft, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MigrationExecutionProps {
  state: MigrationWizardState;
  onComplete: () => void;
}

type Phase = 'precheck' | 'migrating' | 'postverify' | 'completed' | 'failed';

export function MigrationExecution({ state, onComplete }: MigrationExecutionProps) {
  const { getServerById } = useBackupStore();
  const [phase, setPhase] = useState<Phase>(state.runPreCheck ? 'precheck' : 'migrating');
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
      addLog('info', `Migration: ${state.sourceDatabaseName} → ${state.targetDatabaseName}`);
      const scopeParts: string[] = [];
      if (state.scope.schema) scopeParts.push('schema');
      if (state.scope.data) scopeParts.push('data');
      if (state.scope.users) scopeParts.push('users');
      addLog('info', `Scope: ${scopeParts.join(', ')}. Pre-check: ${state.runPreCheck}, Post-verify: ${state.runPostVerification}`);

      if (!sourceServer || !targetServer || !state.sourceDatabaseName || !state.targetDatabaseName) {
        addLog('error', 'Source or target not configured.');
        setPhase('failed');
        setErrorMessage('Missing source or target.');
        return;
      }

      if (state.runPreCheck) {
        setPhase('precheck');
        setProgress(5);
        addLog('info', 'Running pre-check: compatibility, disk space, connectivity...');
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        addLog('info', 'Pre-check passed.');
        setProgress(20);
        await new Promise((r) => setTimeout(r, 300));
      }

      if (cancelled) return;

      setPhase('migrating');
      addLog('info', 'Starting migration...');
      for (let p = 25; p <= 70; p += 10) {
        if (cancelled) return;
        setProgress(p);
        if (state.scope.schema && p <= 45) addLog('info', 'Applying schema...');
        if (state.scope.data && p >= 40) addLog('info', 'Copying data...');
        if (state.scope.users && p >= 55) addLog('info', 'Migrating users and permissions...');
        await new Promise((r) => setTimeout(r, 500));
      }

      if (cancelled) return;

      if (state.runPostVerification) {
        setPhase('postverify');
        setProgress(75);
        addLog('info', 'Running post-migration verification (row counts, checksums)...');
        await new Promise((r) => setTimeout(r, 700));
        if (cancelled) return;
        addLog('info', 'Post-verification passed.');
        setProgress(95);
        await new Promise((r) => setTimeout(r, 300));
      }

      if (cancelled) return;

      setProgress(100);
      setPhase('completed');
      addLog('info', 'Migration completed successfully.');
    };

    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = phase === 'completed' || phase === 'failed';
  const phaseLabel =
    phase === 'precheck'
      ? 'Pre-check'
      : phase === 'migrating'
        ? 'Migrating'
        : phase === 'postverify'
          ? 'Post-verification'
          : phase === 'completed'
            ? 'Completed'
            : 'Failed';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Migration in progress
            </CardTitle>
            <Badge
              variant={phase === 'failed' ? 'destructive' : phase === 'completed' ? 'default' : 'secondary'}
              className={cn(phase === 'completed' && 'bg-emerald-600 hover:bg-emerald-600')}
            >
              {phaseLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              {state.sourceDatabaseName} → {state.targetDatabaseName}
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
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Migration completed</p>
                <p className="text-sm text-muted-foreground">
                  {state.sourceDatabaseName} has been migrated to {state.targetDatabaseName}.
                  {state.runPostVerification && ' Post-verification passed.'}
                </p>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Migration failed</p>
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
