import { useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { ReleaseDeployment } from '@/types/backup.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  Shield,
  RotateCcw,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react';

export function ReleaseHistory() {
  const { releaseDeployments } = useBackupStore();
  const [selectedRelease, setSelectedRelease] = useState<ReleaseDeployment | null>(null);

  const statusIcons = {
    pending: Clock,
    backing_up: Shield,
    deploying: Rocket,
    completed: CheckCircle2,
    failed: XCircle,
    rolled_back: RotateCcw,
  };

  const statusVariants = {
    pending: 'secondary' as const,
    backing_up: 'default' as const,
    deploying: 'default' as const,
    completed: 'default' as const,
    failed: 'destructive' as const,
    rolled_back: 'secondary' as const,
  };

  const handleDownloadScript = (release: ReleaseDeployment) => {
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

  if (releaseDeployments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No release history</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create and deploy a release to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Release History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Source → Target</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releaseDeployments.map((release) => {
                const StatusIcon = statusIcons[release.status];

                return (
                  <TableRow
                    key={release.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRelease(release)}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-mono font-bold text-sm">{release.version}</div>
                        <div className="text-xs text-muted-foreground">#{release.releaseNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {release.sourceDetails.databaseName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          → {release.targetDetails.databaseName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {release.sourceDetails.environment}
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          {release.targetDetails.environment}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[release.status]} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {release.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {release.comparisonResult.summary.missingInTarget} missing
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {release.comparisonResult.summary.modified} modified
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(release.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {release.completedAt
                        ? new Date(release.completedAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadScript(release);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRelease(release);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Release Details Modal/Card */}
      {selectedRelease && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Release Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRelease(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Version and Status */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <div className="text-2xl font-bold font-mono">{selectedRelease.version}</div>
                <div className="text-sm text-muted-foreground">Release #{selectedRelease.releaseNumber}</div>
              </div>
              <Badge variant={statusVariants[selectedRelease.status]} className="gap-2">
                {selectedRelease.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Source and Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Source</div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                      {selectedRelease.sourceDetails.environment}
                    </Badge>
                    <span className="text-sm font-medium">{selectedRelease.sourceDetails.serverName}</span>
                  </div>
                  <div className="text-sm font-mono">{selectedRelease.sourceDetails.databaseName}</div>
                  <div className="text-xs text-muted-foreground">{selectedRelease.sourceDetails.host}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Target</div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                      {selectedRelease.targetDetails.environment}
                    </Badge>
                    <span className="text-sm font-medium">{selectedRelease.targetDetails.serverName}</span>
                  </div>
                  <div className="text-sm font-mono">{selectedRelease.targetDetails.databaseName}</div>
                  <div className="text-xs text-muted-foreground">{selectedRelease.targetDetails.host}</div>
                </div>
              </div>
            </div>

            {/* Comparison Type */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Comparison Type</div>
              <div className="flex flex-wrap gap-2">
                {selectedRelease.comparisonType.structure && <Badge variant="secondary" className="text-xs">Structure</Badge>}
                {selectedRelease.comparisonType.data && <Badge variant="secondary" className="text-xs">Data</Badge>}
                {selectedRelease.comparisonType.procedures && <Badge variant="secondary" className="text-xs">Procedures</Badge>}
                {selectedRelease.comparisonType.views && <Badge variant="secondary" className="text-xs">Views</Badge>}
                {selectedRelease.comparisonType.functions && <Badge variant="secondary" className="text-xs">Functions</Badge>}
                {selectedRelease.comparisonType.triggers && <Badge variant="secondary" className="text-xs">Triggers</Badge>}
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{new Date(selectedRelease.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Completed</div>
                <div>
                  {selectedRelease.completedAt
                    ? new Date(selectedRelease.completedAt).toLocaleString()
                    : 'In progress'}
                </div>
              </div>
            </div>

            {selectedRelease.notes && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <div className="p-3 bg-muted rounded-lg text-sm">{selectedRelease.notes}</div>
              </div>
            )}

            {selectedRelease.preDeploymentBackup && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Pre-deployment Backup</div>
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <div>Backup ID: <span className="font-mono">{selectedRelease.preDeploymentBackup.backupId}</span></div>
                  <div>Created: {new Date(selectedRelease.preDeploymentBackup.createdAt).toLocaleString()}</div>
                </div>
              </div>
            )}

            {selectedRelease.rollbackInfo && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Rollback Information</div>
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm space-y-1">
                  <div>Reason: {selectedRelease.rollbackInfo.reason}</div>
                  <div>Rolled back: {new Date(selectedRelease.rollbackInfo.rolledBackAt).toLocaleString()}</div>
                  <div>
                    Restored from backup: {selectedRelease.rollbackInfo.restoredFromBackup ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
              </div>
            )}

            {selectedRelease.deploymentProgress.errors.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Errors ({selectedRelease.deploymentProgress.errors.length})
                </div>
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm space-y-1 max-h-48 overflow-y-auto">
                  {selectedRelease.deploymentProgress.errors.map((error, idx) => (
                    <div key={idx} className="font-mono text-xs">
                      <span className="font-bold">{error.objectName}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
