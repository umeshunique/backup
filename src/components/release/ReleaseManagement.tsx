import { useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitCompareArrows,
  Rocket,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  ArrowLeft
} from 'lucide-react';
import { SchemaCompare } from '../compare';
import { ReleaseDeploymentCard } from './ReleaseDeploymentCard';
import { ReleaseHistory } from './ReleaseHistory';

export function ReleaseManagement() {
  const { comparisonResult, releaseDeployments, currentRelease, isDeploying } = useBackupStore();
  const [activeTab, setActiveTab] = useState<'compare' | 'deploy' | 'history'>('compare');

  const hasPendingChanges = comparisonResult && comparisonResult.summary.totalDifferences > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Release Management</h2>
          <p className="text-muted-foreground mt-1">
            Compare schemas, create releases, and deploy changes with automatic backup and rollback
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            {releaseDeployments.length} Releases
          </Badge>
          {isDeploying && (
            <Badge variant="default" className="gap-1 animate-pulse">
              <Clock className="h-3 w-3" />
              Deploying...
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compare" className="gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Compare Schemas
            {hasPendingChanges && (
              <Badge variant="destructive" className="ml-2">
                {comparisonResult.summary.totalDifferences}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deploy" className="gap-2" disabled={!hasPendingChanges && !currentRelease}>
            <Rocket className="h-4 w-4" />
            Deploy
            {currentRelease && (
              <Badge variant="default" className="ml-2">
                In Progress
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Release History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="mt-6">
          <div className="space-y-6">
            {hasPendingChanges && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Schema differences detected. Review the changes and create a release to deploy them to the target database.
                </AlertDescription>
              </Alert>
            )}
            <SchemaCompare />
          </div>
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          {currentRelease ? (
            <ReleaseDeploymentCard release={currentRelease} />
          ) : hasPendingChanges ? (
            <Card>
              <CardHeader>
                <CardTitle>Ready to Deploy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    A comparison has been completed with {comparisonResult!.summary.totalDifferences} difference(s) detected.
                    Create a release to deploy these changes.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={() => setActiveTab('compare')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Comparison
                  </Button>
                  <Button
                    onClick={() => {
                      const { createReleaseFromComparison } = useBackupStore.getState();
                      createReleaseFromComparison(comparisonResult!);
                    }}
                  >
                    Create Release
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No deployment in progress</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Run a schema comparison first to create a release
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('compare')}>
                  Go to Compare
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ReleaseHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
