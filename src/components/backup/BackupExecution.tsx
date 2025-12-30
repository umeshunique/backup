import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircularProgress, LogViewer, StatisticsCard } from '@/components/shared';
import { BackupWizardState } from './BackupWizard';
import { useBackupStore } from '@/store/backupStore';
import { ExecutionLog } from '@/types/backup.types';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Pause,
  Play,
  X,
  FolderOpen,
  RefreshCw,
  Database,
  Table2,
  FileCode,
  Clock,
  Zap,
} from 'lucide-react';
import { formatDuration, formatBytes } from '@/utils/mockData';
import { apiClient } from '@/services/apiClient';

interface BackupExecutionProps {
  wizardState: BackupWizardState;
  onComplete: () => void;
}

type ExecutionPhase = 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export function BackupExecution({ wizardState, onComplete }: BackupExecutionProps) {
  const [phase, setPhase] = useState<ExecutionPhase>('initializing');
  const [progress, setProgress] = useState(0);
  const [currentObject, setCurrentObject] = useState('');
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [stats, setStats] = useState({
    processedObjects: 0,
    totalObjects: 0,
    processedRows: 0,
    totalRows: 0,
    currentSize: 0,
    elapsedSeconds: 0,
    rowsPerSecond: 0,
  });

  const totalObjects =
    wizardState.selectedTables.length +
    wizardState.selectedProcedures.length +
    wizardState.selectedViews.length +
    wizardState.selectedFunctions.length +
    wizardState.selectedTriggers.length +
    wizardState.selectedEvents.length;

  const allObjects = [
    ...wizardState.selectedTables.map((t) => ({ name: t, type: 'Table' })),
    ...wizardState.selectedProcedures.map((p) => ({ name: p, type: 'Procedure' })),
    ...wizardState.selectedViews.map((v) => ({ name: v, type: 'View' })),
    ...wizardState.selectedFunctions.map((f) => ({ name: f, type: 'Function' })),
    ...wizardState.selectedTriggers.map((t) => ({ name: t, type: 'Trigger' })),
    ...wizardState.selectedEvents.map((e) => ({ name: e, type: 'Event' })),
  ];

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
    const executeBackup = async () => {
      const { getServerById } = useBackupStore.getState();
      const server = wizardState.serverId ? getServerById(wizardState.serverId) : null;

      if (!server || !wizardState.database) {
        addLog('error', 'Server or database not found');
        setPhase('failed');
        return;
      }

      const totalRows = wizardState.database?.tables
        .filter((t) => wizardState.selectedTables.includes(t.name))
        .reduce((acc, t) => acc + t.rowCount, 0) || 0;

      setStats((prev) => ({ ...prev, totalObjects, totalRows }));

      addLog('info', 'Initializing backup process...');
      addLog('info', `Connecting to ${wizardState.database.name}...`);

      setPhase('running');
      addLog('info', 'Connection established. Starting backup...');

      const startTime = Date.now();

      try {
        // Call the real API to execute backup
        const result = await apiClient.executeBackup({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          type: server.databaseType,
          database: wizardState.database.name,
          includeData: wizardState.backupMode === 'data' || wizardState.backupMode === 'both',
          includeStructure: wizardState.backupMode === 'structure' || wizardState.backupMode === 'both',
          includeProcedures: wizardState.selectedProcedures.length > 0,
          includeViews: wizardState.selectedViews.length > 0,
          includeTriggers: wizardState.selectedTriggers.length > 0,
          includeFunctions: wizardState.selectedFunctions.length > 0,
          tables: wizardState.selectedTables.length > 0 ? wizardState.selectedTables : undefined,
          destinationPath: wizardState.destinationPath,
        });

        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        setProgress(100);
        setPhase('completed');

        addLog('info', 'Backup completed successfully!');
        addLog('info', `File: ${result.data.fileName}`);
        addLog('info', `Path: ${result.data.path}`);
        addLog('info', `Size: ${formatBytes(result.data.size)}`);
        addLog('info', `Total objects processed: ${totalObjects}`);

        setStats((prev) => ({
          ...prev,
          processedObjects: totalObjects,
          processedRows: totalRows,
          currentSize: result.data.size,
          elapsedSeconds,
          rowsPerSecond: totalRows > 0 ? Math.floor(totalRows / Math.max(elapsedSeconds, 1)) : 0,
        }));

        // Reload backup history to show the new backup
        const { loadBackupHistory } = useBackupStore.getState();
        await loadBackupHistory();
        addLog('info', 'Backup history updated');
      } catch (error: any) {
        addLog('error', `Backup failed: ${error.message}`);
        setPhase('failed');
      }
    };

    executeBackup();
  }, []);

  const handlePause = () => {
    setPhase((prev) => (prev === 'paused' ? 'running' : 'paused'));
    addLog('info', phase === 'paused' ? 'Backup resumed' : 'Backup paused');
  };

  const handleCancel = () => {
    setPhase('cancelled');
    addLog('error', 'Backup cancelled by user');
  };

  const isComplete = phase === 'completed' || phase === 'failed' || phase === 'cancelled';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Header */}
      <Card
        className={cn(
          'border-2 transition-colors',
          phase === 'completed' && 'border-green-500/30 bg-green-500/5',
          phase === 'failed' && 'border-red-500/30 bg-red-500/5',
          phase === 'cancelled' && 'border-amber-500/30 bg-amber-500/5',
          phase === 'running' && 'border-primary/30 bg-primary/5',
          phase === 'paused' && 'border-amber-500/30',
          phase === 'initializing' && 'border-border'
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-8">
            {/* Progress Circle */}
            <CircularProgress
              value={progress}
              size={140}
              strokeWidth={12}
              variant={
                phase === 'completed'
                  ? 'success'
                  : phase === 'failed' || phase === 'cancelled'
                  ? 'error'
                  : 'primary'
              }
            />

            {/* Status Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {phase === 'completed' && <CheckCircle className="h-6 w-6 text-green-500" />}
                {phase === 'failed' && <XCircle className="h-6 w-6 text-red-500" />}
                {phase === 'cancelled' && <XCircle className="h-6 w-6 text-amber-500" />}
                {phase === 'running' && (
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                )}
                {phase === 'paused' && <Pause className="h-6 w-6 text-amber-500" />}
                {phase === 'initializing' && (
                  <Database className="h-6 w-6 text-muted-foreground animate-pulse" />
                )}

                <h2 className="text-xl font-bold capitalize">
                  {phase === 'running' ? 'Backup in Progress' : `Backup ${phase}`}
                </h2>

                <Badge
                  variant="outline"
                  className={cn(
                    phase === 'completed' && 'bg-green-500/20 text-green-400 border-green-500/30',
                    phase === 'running' && 'bg-primary/20 text-primary border-primary/30',
                    phase === 'paused' && 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  )}
                >
                  {wizardState.database?.name}
                </Badge>
              </div>

              {!isComplete && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{currentObject || 'Preparing...'}</p>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        phase === 'running' && 'bg-primary progress-animated'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {isComplete && (
                <div className="flex items-center gap-3">
                  <Button onClick={onComplete} className="gap-2">
                    {phase === 'completed' ? (
                      <>
                        <FolderOpen className="h-4 w-4" />
                        Open Backup Location
                      </>
                    ) : (
                      'Close'
                    )}
                  </Button>
                  <Button variant="outline" onClick={onComplete}>
                    Create Another Backup
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isComplete && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  className="gap-2"
                  disabled={phase === 'initializing'}
                >
                  {phase === 'paused' ? (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          title="Objects Processed"
          value={`${stats.processedObjects} / ${stats.totalObjects}`}
          icon={Table2}
          variant="primary"
        />
        <StatisticsCard
          title="Rows Exported"
          value={`${(stats.processedRows / 1000000).toFixed(2)}M`}
          subtitle={`of ${(stats.totalRows / 1000000).toFixed(2)}M total`}
          icon={FileCode}
          variant="default"
        />
        <StatisticsCard
          title="Current Size"
          value={formatBytes(stats.currentSize)}
          icon={Database}
          variant="default"
        />
        <StatisticsCard
          title="Elapsed Time"
          value={formatDuration(stats.elapsedSeconds)}
          subtitle={`${stats.rowsPerSecond.toLocaleString()} rows/sec`}
          icon={Clock}
          variant="default"
        />
      </div>

      {/* Log Viewer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LogViewer logs={logs} maxHeight={300} autoScroll />
        </CardContent>
      </Card>
    </div>
  );
}
