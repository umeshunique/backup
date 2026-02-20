import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RotateCcw,
  Copy,
  Download,
  FileText,
  History,
  Package,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { EnvironmentBadge } from '@/components/shared';
import {
  generateDeploymentRollbackScript,
  generateBackupRollbackScript,
} from './rollbackScriptUtils';
import { toast } from '@/hooks/use-toast';
import type { ReleaseDeployment, BackupHistory } from '@/types/backup.types';

type SourceType = 'deployment' | 'backup';

export function RollbackScriptGenerator() {
  const {
    releaseDeployments,
    backupHistory,
    loadBackupHistory,
  } = useBackupStore();

  const [sourceType, setSourceType] = useState<SourceType>('deployment');
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [includeInstructions, setIncludeInstructions] = useState(true);

  const deploymentsWithBackup = releaseDeployments.filter(
    (r) => r.preDeploymentBackup && (r.status === 'completed' || r.status === 'failed' || r.status === 'rolled_back')
  );

  const selectedRelease = selectedReleaseId
    ? releaseDeployments.find((r) => r.id === selectedReleaseId)
    : undefined;
  const selectedBackup = selectedBackupId
    ? backupHistory.find((b) => b.id === selectedBackupId)
    : undefined;

  const rollbackScript =
    sourceType === 'deployment' && selectedRelease
      ? generateDeploymentRollbackScript(selectedRelease, { includeInstructions })
      : sourceType === 'backup' && selectedBackup
        ? generateBackupRollbackScript(selectedBackup, { includeInstructions })
        : '';

  useEffect(() => {
    loadBackupHistory();
  }, [loadBackupHistory]);

  const handleCopy = async () => {
    if (!rollbackScript) return;
    try {
      await navigator.clipboard.writeText(rollbackScript);
      toast({ title: 'Copied', description: 'Rollback script copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    if (!rollbackScript) return;
    const name =
      sourceType === 'deployment' && selectedRelease
        ? `rollback_${selectedRelease.version.replace(/\s+/g, '_')}.sql`
        : sourceType === 'backup' && selectedBackup
          ? `rollback_${selectedBackup.fileName.replace(/\.[^.]+$/, '')}.sql`
          : 'rollback_script.sql';
    const blob = new Blob([rollbackScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: name });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Source for rollback script
          </CardTitle>
          <CardDescription>
            Choose deployment history (pre-deployment backup) or backup metadata to generate a rollback or restore script.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={sourceType}
            onValueChange={(v) => {
              setSourceType(v as SourceType);
              setSelectedReleaseId('');
              setSelectedBackupId('');
            }}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="deployment" id="source-deployment" />
              <Label htmlFor="source-deployment" className="flex items-center gap-2 cursor-pointer font-medium">
                <Package className="h-4 w-4" />
                From deployment history
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="backup" id="source-backup" />
              <Label htmlFor="source-backup" className="flex items-center gap-2 cursor-pointer font-medium">
                <History className="h-4 w-4" />
                From backup metadata
              </Label>
            </div>
          </RadioGroup>

          {sourceType === 'deployment' && (
            <div className="space-y-2">
              <Label>Deployment with pre-deployment backup</Label>
              <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a deployment…" />
                </SelectTrigger>
                <SelectContent>
                  {deploymentsWithBackup.length === 0 ? (
                    <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                      No deployments with pre-deployment backup found.
                    </div>
                  ) : (
                    deploymentsWithBackup.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          {r.version} → {r.targetDetails.serverName} / {r.targetDetails.databaseName}
                          <EnvironmentBadge environment={r.targetDetails.environment} />
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {deploymentsWithBackup.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Deploy a release from Release Management to get pre-deployment backups here.
                </p>
              )}
            </div>
          )}

          {sourceType === 'backup' && (
            <div className="space-y-2">
              <Label>Backup</Label>
              <Select value={selectedBackupId} onValueChange={setSelectedBackupId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a backup…" />
                </SelectTrigger>
                <SelectContent>
                  {backupHistory.length === 0 ? (
                    <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                      No backup history. Run a backup first.
                    </div>
                  ) : (
                    backupHistory.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="flex items-center gap-2">
                          {b.fileName}
                          <span className="text-muted-foreground">
                            {b.databaseName ?? b.database}
                            {b.environment && <EnvironmentBadge environment={b.environment} />}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {backupHistory.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Backup history is empty. Create a backup from the Backup wizard.
                </p>
              )}
            </div>
          )}

          {(selectedRelease || selectedBackup) && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="include-instructions"
                checked={includeInstructions}
                onChange={(e) => setIncludeInstructions(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="include-instructions" className="text-sm font-normal cursor-pointer">
                Include header and instructions in script
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {(selectedRelease || selectedBackup) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated rollback script
            </CardTitle>
            <CardDescription>
              Copy or download to run restore manually, or use the Restore wizard with the backup file.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2" disabled={!rollbackScript}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2" disabled={!rollbackScript}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] w-full rounded-md border bg-muted/30 p-4 font-mono text-sm">
              <pre className="whitespace-pre-wrap break-words text-foreground">
                {rollbackScript || 'Select a deployment or backup above.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!selectedRelease && !selectedBackup && sourceType === 'deployment' && deploymentsWithBackup.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Select a deployment above to generate its rollback script from the pre-deployment backup.
            </p>
          </CardContent>
        </Card>
      )}
      {!selectedRelease && !selectedBackup && sourceType === 'backup' && backupHistory.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Select a backup above to generate a restore/rollback script from its metadata.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
