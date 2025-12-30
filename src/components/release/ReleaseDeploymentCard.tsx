import { useState } from 'react';
import { ReleaseDeployment } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Rocket,
  Shield,
  RotateCcw,
  Clock,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReleaseDeploymentCardProps {
  release: ReleaseDeployment;
}

export function ReleaseDeploymentCard({ release }: ReleaseDeploymentCardProps) {
  const { deployRelease, rollbackRelease, isDeploying } = useBackupStore();
  const [showDetails, setShowDetails] = useState(true);
  const [deploymentNotes, setDeploymentNotes] = useState(release.notes || '');

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending', variant: 'secondary' as const, color: 'text-gray-500' },
    backing_up: { icon: Shield, label: 'Creating Backup...', variant: 'default' as const, color: 'text-blue-500' },
    deploying: { icon: Rocket, label: 'Deploying...', variant: 'default' as const, color: 'text-blue-500' },
    completed: { icon: CheckCircle2, label: 'Completed', variant: 'default' as const, color: 'text-green-500' },
    failed: { icon: XCircle, label: 'Failed', variant: 'destructive' as const, color: 'text-red-500' },
    rolled_back: { icon: RotateCcw, label: 'Rolled Back', variant: 'secondary' as const, color: 'text-orange-500' },
  };

  const config = statusConfig[release.status];
  const Icon = config.icon;

  const handleDeploy = async () => {
    if (window.confirm('This will deploy the schema changes to the target database. A backup will be created automatically. Continue?')) {
      await deployRelease(release.id);
    }
  };

  const handleRollback = async () => {
    if (window.confirm('This will rollback the deployment and restore from the pre-deployment backup. Continue?')) {
      await rollbackRelease(release.id);
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([release.comparisonResult.deploymentScript], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release_${release.id}_deployment.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="space-y-3">
          {/* Title and Status */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', config.color)} />
                Release {release.version}
                <Badge variant="outline" className="font-mono text-xs">
                  #{release.releaseNumber}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Created: {new Date(release.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.variant}>{config.label}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Source and Target Details */}
          <div className="flex items-center gap-4 pt-3 border-t">
            {/* Source */}
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Source</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {release.sourceDetails.environment}
                </Badge>
                <span className="text-sm font-medium">{release.sourceDetails.serverName}</span>
              </div>
              <div className="text-sm font-mono">{release.sourceDetails.databaseName}</div>
              <div className="text-xs text-muted-foreground">{release.sourceDetails.host}</div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 text-3xl text-muted-foreground px-4">
              →
            </div>

            {/* Target */}
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Target</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {release.targetDetails.environment}
                </Badge>
                <span className="text-sm font-medium">{release.targetDetails.serverName}</span>
              </div>
              <div className="text-sm font-mono">{release.targetDetails.databaseName}</div>
              <div className="text-xs text-muted-foreground">{release.targetDetails.host}</div>
            </div>
          </div>

          {/* Comparison Type */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-muted-foreground">Comparing:</span>
            {release.comparisonType.structure && <Badge variant="secondary" className="text-xs">Structure</Badge>}
            {release.comparisonType.data && <Badge variant="secondary" className="text-xs">Data</Badge>}
            {release.comparisonType.procedures && <Badge variant="secondary" className="text-xs">Procedures</Badge>}
            {release.comparisonType.views && <Badge variant="secondary" className="text-xs">Views</Badge>}
            {release.comparisonType.functions && <Badge variant="secondary" className="text-xs">Functions</Badge>}
            {release.comparisonType.triggers && <Badge variant="secondary" className="text-xs">Triggers</Badge>}
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {release.comparisonResult.summary.missingInTarget}
              </div>
              <div className="text-xs text-muted-foreground">Missing in Target</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {release.comparisonResult.summary.modified}
              </div>
              <div className="text-xs text-muted-foreground">Modified</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">
                {release.comparisonResult.summary.extraInTarget}
              </div>
              <div className="text-xs text-muted-foreground">Extra in Target</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {release.comparisonResult.summary.totalDifferences}
              </div>
              <div className="text-xs text-muted-foreground">Total Changes</div>
            </div>
          </div>

          {/* Deployment Workflow Visualization */}
          <div className={cn(
            "p-4 rounded-lg border",
            release.status === 'rolled_back' ? "bg-gradient-to-r from-orange-50 to-red-50 border-orange-300" :
            release.status === 'failed' ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-300" :
            release.status === 'completed' ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300" :
            "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
          )}>
            <h4 className={cn(
              "text-sm font-semibold mb-3",
              release.status === 'rolled_back' ? "text-orange-900" :
              release.status === 'failed' ? "text-red-900" :
              release.status === 'completed' ? "text-green-900" :
              "text-blue-900"
            )}>
              {release.status === 'rolled_back' ? '🔄 Deployment Rolled Back' :
               release.status === 'failed' ? '❌ Deployment Failed' :
               release.status === 'completed' ? '✅ Deployment Successful' :
               'Deployment Process:'}
            </h4>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  release.status === 'backing_up' ? "bg-blue-500 text-white animate-pulse" :
                  release.status === 'deploying' ? "bg-green-500 text-white" :
                  release.status === 'completed' ? "bg-green-500 text-white" :
                  release.status === 'failed' ? "bg-green-500 text-white" :
                  release.status === 'rolled_back' ? "bg-green-500 text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  <Shield className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium">1. Backup</div>
                <div className="text-xs text-muted-foreground">
                  {release.status === 'rolled_back' ? 'Restored ✓' : 'Auto-created'}
                </div>
              </div>
              <div className="flex-shrink-0 text-blue-300">→</div>
              <div className="flex-1 text-center">
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  release.status === 'deploying' ? "bg-blue-500 text-white animate-pulse" :
                  release.status === 'completed' ? "bg-green-500 text-white" :
                  release.status === 'failed' ? "bg-red-500 text-white" :
                  release.status === 'rolled_back' ? "bg-red-500 text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {(release.status === 'failed' || release.status === 'rolled_back') ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <Rocket className="h-5 w-5" />
                  )}
                </div>
                <div className="text-xs font-medium">2. Deploy</div>
                <div className="text-xs text-muted-foreground">
                  {release.status === 'failed' || release.status === 'rolled_back' ? 'Failed ✗' : 'Apply changes'}
                </div>
              </div>
              <div className="flex-shrink-0 text-blue-300">→</div>
              <div className="flex-1 text-center">
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  release.status === 'completed' ? "bg-green-500 text-white" :
                  release.status === 'failed' ? "bg-orange-500 text-white" :
                  release.status === 'rolled_back' ? "bg-orange-500 text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {release.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                   release.status === 'failed' ? <RotateCcw className="h-5 w-5 animate-spin" /> :
                   release.status === 'rolled_back' ? <RotateCcw className="h-5 w-5" /> :
                   <Clock className="h-5 w-5" />}
                </div>
                <div className="text-xs font-medium">3. Complete</div>
                <div className="text-xs text-muted-foreground">
                  {release.status === 'completed' ? 'Success ✓' :
                   release.status === 'failed' ? 'Rolling back...' :
                   release.status === 'rolled_back' ? 'Restored ✓' :
                   'Pending'}
                </div>
              </div>
            </div>
            {release.status === 'pending' && (
              <div className="mt-3 text-xs text-center text-blue-700 bg-blue-100 rounded p-2">
                ⚡ If deployment fails, database will automatically rollback to backup
              </div>
            )}
            {release.status === 'rolled_back' && (
              <div className="mt-3 text-xs text-center text-orange-900 bg-orange-100 rounded p-2 font-semibold">
                ✓ Database restored to pre-deployment state
              </div>
            )}
          </div>

          {/* Deployment Notes */}
          {release.status === 'pending' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Deployment Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this deployment..."
                value={deploymentNotes}
                onChange={(e) => setDeploymentNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Progress Indicator */}
          {(release.status === 'backing_up' || release.status === 'deploying') && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{release.deploymentProgress.currentStep}</span>
                <span className="text-muted-foreground">
                  {release.deploymentProgress.completedSteps} / {release.deploymentProgress.totalSteps}
                </span>
              </div>
              <Progress
                value={(release.deploymentProgress.completedSteps / release.deploymentProgress.totalSteps) * 100}
              />
            </div>
          )}

          {/* Backup Info */}
          {release.preDeploymentBackup && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Pre-deployment backup created</div>
                <div className="text-sm mt-1">
                  Backup ID: {release.preDeploymentBackup.backupId}
                  <br />
                  Created: {new Date(release.preDeploymentBackup.createdAt).toLocaleString()}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {release.deploymentProgress.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Deployment Errors ({release.deploymentProgress.errors.length})</div>
                <div className="mt-2 space-y-1 text-xs">
                  {release.deploymentProgress.errors.slice(0, 3).map((error, idx) => (
                    <div key={idx} className="font-mono">
                      {error.objectName}: {error.error}
                    </div>
                  ))}
                  {release.deploymentProgress.errors.length > 3 && (
                    <div className="text-muted-foreground">
                      ... and {release.deploymentProgress.errors.length - 3} more errors
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Rollback Info */}
          {release.rollbackInfo && (
            <Alert
              variant={release.rollbackInfo.restoredFromBackup ? 'default' : 'destructive'}
              className={release.rollbackInfo.restoredFromBackup ? 'border-orange-300 bg-orange-50' : ''}
            >
              <RotateCcw className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-lg">
                    {release.rollbackInfo.restoredFromBackup ? '🔄 Rollback Completed' : '❌ Rollback Failed'}
                  </div>
                  {release.rollbackInfo.restoredFromBackup && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Database Restored
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Reason</div>
                      <div className="font-medium">{release.rollbackInfo.reason}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rolled Back At</div>
                      <div className="font-medium">{new Date(release.rollbackInfo.rolledBackAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-md flex items-center gap-2",
                    release.rollbackInfo.restoredFromBackup
                      ? "bg-green-100 text-green-900"
                      : "bg-red-100 text-red-900"
                  )}>
                    {release.rollbackInfo.restoredFromBackup ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">Database Successfully Restored</div>
                          <div className="text-xs mt-1">
                            Your target database has been restored to the state before deployment using the pre-deployment backup.
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">Rollback Failed</div>
                          <div className="text-xs mt-1">
                            Could not restore from backup. Please manually restore the database.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {release.preDeploymentBackup && release.rollbackInfo.restoredFromBackup && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <strong>Backup Used:</strong> {release.preDeploymentBackup.backupId}
                      <br />
                      <strong>Backup Created:</strong> {new Date(release.preDeploymentBackup.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleDownloadScript}>
              <Download className="h-4 w-4 mr-2" />
              Download Script
            </Button>

            <div className="flex gap-2">
              {release.status === 'pending' && (
                <Button onClick={handleDeploy} disabled={isDeploying}>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy to Target
                </Button>
              )}

              {release.status === 'deploying' && release.preDeploymentBackup && (
                <Button
                  variant="destructive"
                  onClick={handleRollback}
                  disabled={isDeploying}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Emergency Rollback
                </Button>
              )}

              {release.status === 'failed' && release.preDeploymentBackup && (
                <Button
                  variant="secondary"
                  onClick={handleRollback}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore from Backup
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
