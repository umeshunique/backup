import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useBackupStore } from '@/store/backupStore';
import { EnvironmentBadge, StatusBadge } from '@/components/shared';
import { apiClient } from '@/services/apiClient';
import { Database, ArrowRight, ArrowLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatBytes } from '@/utils/mockData';
import { toast } from '@/hooks/use-toast';

type RestoreStep = 'select-backup' | 'select-server' | 'select-schema' | 'confirm' | 'executing' | 'completed';

interface RestoreSummary {
  tables: number;
  procedures: number;
  views: number;
  triggers: number;
  functions: number;
  total: number;
}

export function RestoreWizard() {
  const { backupHistory, servers, getDatabasesForServer, loadDatabasesForServer } = useBackupStore();
  const [step, setStep] = useState<RestoreStep>('select-backup');
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string>('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [objectsRestored, setObjectsRestored] = useState({
    tables: 0,
    procedures: 0,
    views: 0,
    triggers: 0,
    functions: 0
  });
  const [restoreId, setRestoreId] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedBackup = backupHistory.find(b => b.id === selectedBackupId);
  const selectedServer = servers.find(s => s.id === selectedServerId);

  const filteredBackups = selectedEnvironment === 'all'
    ? backupHistory
    : backupHistory.filter(b => b.environment === selectedEnvironment);

  // Poll for progress updates
  useEffect(() => {
    if (restoreId && restoreStatus === 'running') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progressResult = await apiClient.getRestoreProgress(restoreId);
          if (progressResult.success) {
            const { progress: progressData } = progressResult;
            setRestoreProgress(progressData.progress);
            setObjectsRestored(progressData.objectsRestored);

            if (progressData.status === 'completed') {
              setRestoreStatus('success');
              // Keep the original restoreSummary (source counts) instead of overwriting with objectsRestored (target counts)
              setStep('completed');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              toast({
                title: 'Restore Successful',
                description: `Database "${selectedBackup?.databaseName}" has been restored successfully.`,
              });
            } else if (progressData.status === 'failed') {
              setRestoreStatus('failed');
              setErrorMessage(progressData.error || 'Restore failed');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              toast({
                title: 'Restore Failed',
                description: progressData.error || 'An error occurred during restore',
                variant: 'destructive',
              });
            }
          }
        } catch (error: any) {
          console.error('Error polling progress:', error);
        }
      }, 500); // Poll every 500ms

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [restoreId, restoreStatus, selectedBackup?.databaseName]);

  const handleRestoreExecute = async () => {
    if (!selectedBackup || !selectedServer || !selectedDatabaseName) return;

    setStep('executing');
    setRestoreStatus('running');
    setErrorMessage('');
    setRestoreSummary(null);
    setRestoreProgress(0);
    setObjectsRestored({ tables: 0, procedures: 0, views: 0, triggers: 0, functions: 0 });

    try {
      const backupFilePath = selectedBackup.path || selectedBackup.filePath || '';

      const result = await apiClient.restoreBackup({
        host: selectedServer.host,
        port: selectedServer.port,
        user: selectedServer.username,
        password: selectedServer.password,
        type: selectedServer.databaseType,
        database: selectedDatabaseName,
        backupFilePath: backupFilePath,
      });

      if (result.success) {
        // Store restore ID and start polling
        setRestoreId(result.restoreId);
        setRestoreSummary(result.summary);
      } else {
        setRestoreStatus('failed');
        setErrorMessage('Failed to start restore.');
        toast({
          title: 'Restore Failed',
          description: 'Failed to start the database restore.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setRestoreStatus('failed');
      setErrorMessage(error.message || 'An unexpected error occurred');
      toast({
        title: 'Restore Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const resetWizard = () => {
    setStep('select-backup');
    setSelectedBackupId('');
    setSelectedServerId('');
    setSelectedEnvironment('all');
    setSelectedDatabaseName('');
    setRestoreStatus('idle');
    setErrorMessage('');
  };

  // Step 1: Select Backup
  if (step === 'select-backup') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Restore Database</h2>
          <p className="text-muted-foreground">Select a backup to restore</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Available Backups</CardTitle>
              <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="uat">UAT</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="dr">DR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {filteredBackups.map((backup) => (
                  <div
                    key={backup.id}
                    onClick={() => setSelectedBackupId(backup.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedBackupId === backup.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold">{backup.databaseName}</h4>
                          <EnvironmentBadge environment={backup.environment} size="sm" />
                          <StatusBadge status={backup.status} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground font-mono mb-2">{backup.fileName}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{format(new Date(backup.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                          <span>•</span>
                          <span>{formatBytes(backup.fileSize)}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{backup.backupType}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredBackups.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No backups found for this environment
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => setStep('select-server')}
            disabled={!selectedBackupId}
            className="gap-2"
          >
            Next: Select Server
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Select Server
  if (step === 'select-server') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Select Target Server</h2>
          <p className="text-muted-foreground">Choose where to restore the backup</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">{selectedBackup?.databaseName}</h4>
                <EnvironmentBadge environment={selectedBackup?.environment || 'development'} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground font-mono">{selectedBackup?.fileName}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Server</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    onClick={() => setSelectedServerId(server.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedServerId === server.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{server.name}</h4>
                          <EnvironmentBadge environment={server.environment} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {server.host}:{server.port}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {server.databaseType}
                      </Badge>
                    </div>
                  </div>
                ))}
                {servers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No servers configured. Please add a server first.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('select-backup')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => {
              setStep('select-schema');
              if (selectedServerId) {
                loadDatabasesForServer(selectedServerId);
              }
            }}
            disabled={!selectedServerId}
            className="gap-2"
          >
            Next: Select Database
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Select Schema/Database
  if (step === 'select-schema') {
    const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Select Target Database</h2>
          <p className="text-muted-foreground">Choose which database to restore to on the server</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Original: {selectedBackup?.databaseName}</h4>
                <EnvironmentBadge environment={selectedBackup?.environment || 'development'} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                You can restore this backup to a different database name if needed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Databases on {selectedServer?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {/* Option to restore to original database name */}
                <div
                  onClick={() => setSelectedDatabaseName(selectedBackup?.databaseName || '')}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedDatabaseName === selectedBackup?.databaseName
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{selectedBackup?.databaseName}</h4>
                      <p className="text-sm text-muted-foreground">Restore to original database name</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Original</Badge>
                  </div>
                </div>

                {/* Existing databases */}
                {databases.map((db) => (
                  <div
                    key={db.name}
                    onClick={() => setSelectedDatabaseName(db.name)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedDatabaseName === db.name
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <h4 className="font-semibold">{db.name}</h4>
                        {db.tableCount > 0 && (
                          <p className="text-sm text-muted-foreground">{db.tableCount} tables</p>
                        )}
                      </div>
                      {db.name !== selectedBackup?.databaseName && (
                        <Badge variant="outline" className="text-[10px]">Existing</Badge>
                      )}
                    </div>
                  </div>
                ))}

                {databases.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Loading databases...</p>
                    <p className="text-xs mt-2">Or restore to original database name above</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('select-server')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => setStep('confirm')}
            disabled={!selectedDatabaseName}
            className="gap-2"
          >
            Next: Confirm
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Confirm
  if (step === 'confirm') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Confirm Restore</h2>
          <p className="text-muted-foreground">Review the restore details before proceeding</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This operation will restore the selected backup to the target server.
              <strong className="text-foreground"> All existing data in the database "{selectedBackup?.databaseName}" will be replaced.</strong>
              Please ensure you have a recent backup of the current database before proceeding.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Database Name</Label>
                <p className="font-medium">{selectedBackup?.databaseName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Environment</Label>
                <div className="mt-1">
                  <EnvironmentBadge environment={selectedBackup?.environment || 'development'} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Backup Date</Label>
                <p className="text-sm">{selectedBackup && format(new Date(selectedBackup.createdAt), 'PPpp')}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">File Size</Label>
                <p className="text-sm">{selectedBackup && formatBytes(selectedBackup.fileSize)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Backup Type</Label>
                <Badge variant="outline" className="capitalize">{selectedBackup?.backupType}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target Server</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Server Name</Label>
                <p className="font-medium">{selectedServer?.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Environment</Label>
                <div className="mt-1">
                  <EnvironmentBadge environment={selectedServer?.environment || 'development'} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Host</Label>
                <p className="text-sm font-mono">{selectedServer?.host}:{selectedServer?.port}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Database Type</Label>
                <Badge variant="outline" className="uppercase">{selectedServer?.databaseType}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Database</Label>
                <p className="font-medium text-primary">{selectedDatabaseName}</p>
                {selectedDatabaseName !== selectedBackup?.databaseName && (
                  <p className="text-xs text-amber-400 mt-1">⚠ Different from original</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('select-schema')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleRestoreExecute} className="gap-2" variant="default">
            <RotateCcw className="h-4 w-4" />
            Start Restore
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Executing
  if (step === 'executing') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto py-12">
          <div className={`rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 ${
            restoreStatus === 'running' ? 'bg-blue-500/10 animate-pulse' :
            restoreStatus === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            {restoreStatus === 'running' && <RotateCcw className="h-10 w-10 text-blue-400 animate-spin" />}
            {restoreStatus === 'success' && <CheckCircle2 className="h-10 w-10 text-green-400" />}
            {restoreStatus === 'failed' && <AlertCircle className="h-10 w-10 text-red-400" />}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {restoreStatus === 'running' && 'Restoring Database...'}
            {restoreStatus === 'success' && 'Restore Successful!'}
            {restoreStatus === 'failed' && 'Restore Failed'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {restoreStatus === 'running' && 'Please wait while the database is being restored. This may take several minutes.'}
            {restoreStatus === 'success' && `The database "${selectedBackup?.databaseName}" has been restored successfully.`}
            {restoreStatus === 'failed' && errorMessage}
          </p>

          {restoreStatus === 'running' && (
            <Card className="text-left max-w-lg mx-auto mb-8 border-blue-500/50">
              <CardHeader className="pb-3 bg-blue-500/5">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="relative">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  </div>
                  Restoring Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Database:</span>
                    <span className="font-medium font-mono text-blue-500">{selectedDatabaseName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Server:</span>
                    <span className="font-medium">{selectedServer?.name}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="space-y-4">
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold text-blue-500">Progress</span>
                        <span className="font-semibold text-blue-500">{restoreProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${restoreProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Objects restored */}
                    {restoreSummary && (
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-medium">Objects Restored:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tables:</span>
                            <span className="font-medium">{objectsRestored.tables} / {restoreSummary.tables}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Procedures:</span>
                            <span className="font-medium">{objectsRestored.procedures} / {restoreSummary.procedures}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Views:</span>
                            <span className="font-medium">{objectsRestored.views} / {restoreSummary.views}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Triggers:</span>
                            <span className="font-medium">{objectsRestored.triggers} / {restoreSummary.triggers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Functions:</span>
                            <span className="font-medium">{objectsRestored.functions} / {restoreSummary.functions}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {restoreStatus === 'failed' && (
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setStep('confirm')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Confirm
              </Button>
              <Button onClick={resetWizard}>Try Again</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 5: Completed
  if (step === 'completed') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto py-12">
          <div className="rounded-full bg-green-500/10 w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Restore Completed!</h2>
          <p className="text-muted-foreground mb-8">
            The database "{selectedBackup?.databaseName}" has been successfully restored to {selectedServer?.name}.
          </p>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto mb-8">
            <Card className="text-left">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Restore Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source Backup:</span>
                  <span className="font-medium">{selectedBackup?.databaseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Database:</span>
                  <span className="font-medium">{selectedDatabaseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Server:</span>
                  <span className="font-medium">{selectedServer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restored At:</span>
                  <span className="font-medium">{format(new Date(), 'PPpp')}</span>
                </div>
              </CardContent>
            </Card>

            {restoreSummary && (
              <Card className="text-left">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Objects Restored</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tables:</span>
                    <span className="font-medium">{restoreSummary.tables}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Procedures:</span>
                    <span className="font-medium">{restoreSummary.procedures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views:</span>
                    <span className="font-medium">{restoreSummary.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Triggers:</span>
                    <span className="font-medium">{restoreSummary.triggers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Functions:</span>
                    <span className="font-medium">{restoreSummary.functions}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Objects:</span>
                    <span>{restoreSummary.total}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={resetWizard}>
              Restore Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
