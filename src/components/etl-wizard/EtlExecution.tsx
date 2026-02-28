import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogViewer } from '@/components/shared';
import { apiClient } from '@/services/apiClient';
import { useBackupStore } from '@/store/backupStore';
import type { EtlWizardState } from './EtlWizard';
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EtlExecutionProps {
  state: EtlWizardState;
  onComplete: () => void;
}

export function EtlExecution({ state, onComplete }: EtlExecutionProps) {
  const { getServerById } = useBackupStore();
  const [phase, setPhase] = useState<'running' | 'completed' | 'failed'>('running');
  const [result, setResult] = useState<{
    success: boolean;
    rowsExtracted: number;
    rowsLoaded: number;
    batches: number;
    error?: string;
    logs: string[];
  } | null>(null);

  const sourceServer = state.sourceServerId ? getServerById(state.sourceServerId) : null;
  const targetServer = state.targetServerId ? getServerById(state.targetServerId) : null;

  useEffect(() => {
    if (!sourceServer || !targetServer || !state.sourceDatabaseName || !state.targetDatabaseName || !state.sourceTable || !state.targetTable) {
      setPhase('failed');
      setResult({
        success: false,
        rowsExtracted: 0,
        rowsLoaded: 0,
        batches: 0,
        error: 'Missing source or target configuration.',
        logs: [],
      });
      return;
    }

    const run = async () => {
      try {
        const res = await apiClient.runEtl({
          source: {
            host: sourceServer.host,
            port: sourceServer.port,
            user: sourceServer.username,
            password: sourceServer.password,
            type: sourceServer.databaseType,
            database: state.sourceDatabaseName!,
            table: state.sourceTable!,
          },
          target: {
            host: targetServer.host,
            port: targetServer.port,
            user: targetServer.username,
            password: targetServer.password,
            type: targetServer.databaseType,
            database: state.targetDatabaseName!,
            table: state.targetTable!,
          },
          options: {
            mode: state.mode,
            transform:
              state.mode === 'etl'
                ? {
                    ...(Object.keys(state.columnMap).length > 0 && { columnMap: state.columnMap }),
                    ...(state.filter.trim() && { filter: state.filter.trim() }),
                  }
                : state.postLoadSql.trim()
                  ? { postLoadSql: state.postLoadSql.trim() }
                  : undefined,
            batchSize: state.batchSize,
            truncateFirst: state.truncateFirst,
          },
        });
        setResult(res);
        setPhase(res.success ? 'completed' : 'failed');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setResult({
          success: false,
          rowsExtracted: 0,
          rowsLoaded: 0,
          batches: 0,
          error: message,
          logs: [],
        });
        setPhase('failed');
      }
    };

    run();
  }, []);

  const isDone = phase === 'completed' || phase === 'failed';
  const logs = result?.logs ?? [];
  const logEntries = logs.map((msg, i) => ({
    id: `log-${i}`,
    timestamp: new Date(),
    level: result?.error && msg.includes('error') ? 'error' : 'info',
    message: msg,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {phase === 'running' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {phase === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {phase === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
              {state.mode.toUpperCase()} {phase === 'running' ? 'Running…' : phase === 'completed' ? 'Completed' : 'Failed'}
            </CardTitle>
            {isDone && (
              <Button variant="outline" size="sm" onClick={onComplete} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div className={cn(
              'rounded-lg p-3 text-sm',
              result.success ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-destructive/10 text-destructive'
            )}>
              {result.success ? (
                <p>Extracted {result.rowsExtracted} rows, loaded {result.rowsLoaded} rows in {result.batches} batch(es).</p>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}
          {logs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Log</p>
              <ScrollArea className="h-[280px] rounded-md border bg-muted/30 p-3">
                <LogViewer logs={logEntries} />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
