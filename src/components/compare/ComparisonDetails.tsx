import { useState } from 'react';
import { SchemaComparisonResult, SchemaObjectDifference, DifferenceType, ObjectType } from '@/types/backup.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, FileCode, Eye, Zap, Code2, Calendar, AlertCircle, CheckCircle2, Download, Code, Copy, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ObjectDetailView } from './ObjectDetailView';
import { toast } from '@/hooks/use-toast';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';

interface ComparisonDetailsProps {
  result: SchemaComparisonResult;
}

const objectTypeConfig = {
  table: { icon: Database, label: 'Tables', color: 'blue' },
  procedure: { icon: Code2, label: 'Procedures', color: 'purple' },
  view: { icon: Eye, label: 'Views', color: 'cyan' },
  function: { icon: FileCode, label: 'Functions', color: 'green' },
  trigger: { icon: Zap, label: 'Triggers', color: 'orange' },
  event: { icon: Calendar, label: 'Events', color: 'pink' },
};

const differenceTypeConfig: Record<DifferenceType, { label: string; variant: any; icon: any }> = {
  missing: { label: 'Missing in Target', variant: 'destructive', icon: AlertCircle },
  extra: { label: 'Extra in Target', variant: 'secondary', icon: AlertCircle },
  modified: { label: 'Modified', variant: 'default', icon: AlertCircle },
  identical: { label: 'Identical', variant: 'outline', icon: CheckCircle2 },
};

export function ComparisonDetails({ result }: ComparisonDetailsProps) {
  const [activeTab, setActiveTab] = useState<ObjectType>('table');
  const [selectedObject, setSelectedObject] = useState<SchemaObjectDifference | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const { servers } = useBackupStore();

  const handleDownloadAllScripts = () => {
    if (!result.deploymentScript) return;

    const blob = new Blob([result.deploymentScript], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.sourceDatabase}_to_${result.targetDatabase}_deployment.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleCopyScript = async () => {
    if (!result.deploymentScript) return;

    try {
      await navigator.clipboard.writeText(result.deploymentScript);
      toast({
        title: "Success",
        description: "Deployment script copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy script to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDeployToTarget = async () => {
    if (!result.deploymentScript) return;

    setIsDeploying(true);
    try {
      // Find target server
      const targetServer = servers.find(s => s.id === result.targetServerId);
      if (!targetServer) {
        throw new Error('Target server not found');
      }

      // Split the deployment script into individual statements
      const statements = result.deploymentScript
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== '');

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const statement of statements) {
        try {
          await apiClient.executeQuery({
            host: targetServer.host,
            port: targetServer.port,
            user: targetServer.username,
            password: targetServer.password,
            database: result.targetDatabase,
            type: targetServer.databaseType,
            query: statement + ';'
          });
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${statement.substring(0, 50)}...: ${error.message || error}`);
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Success",
          description: `Deployment completed successfully! ${successCount} statements executed.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successCount} statements succeeded, ${errorCount} failed. Check console for details.`,
          variant: "destructive",
        });
        console.error('Deployment errors:', errors);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to deploy: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const renderDifferenceTable = (differences: SchemaObjectDifference[], type: ObjectType) => {
    const filteredDiffs = differences.filter(d => d.differenceType !== 'identical');

    if (filteredDiffs.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <p>No differences found for {objectTypeConfig[type].label.toLowerCase()}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDiffs.map((diff, index) => {
              const config = differenceTypeConfig[diff.differenceType];
              const Icon = config.icon;

              return (
                <TableRow key={index} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{diff.name}</TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {diff.details || 'No additional details'}
                    {diff.columnDifferences && (
                      <Badge variant="outline" className="ml-2">
                        {diff.columnDifferences.length} column{diff.columnDifferences.length !== 1 ? 's' : ''} changed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedObject(diff)}
                      className="gap-2"
                    >
                      <Code className="h-3 w-3" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {selectedObject && (
          <ObjectDetailView
            difference={selectedObject}
            onClose={() => setSelectedObject(null)}
          />
        )}
      </div>
    );
  };

  const getCounts = (type: ObjectType) => {
    const diffs = result.differences[`${type}s` as keyof typeof result.differences] as SchemaObjectDifference[];
    const missing = diffs.filter(d => d.differenceType === 'missing').length;
    const extra = diffs.filter(d => d.differenceType === 'extra').length;
    const modified = diffs.filter(d => d.differenceType === 'modified').length;
    const total = missing + extra + modified;

    return { total, missing, extra, modified };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Detailed Differences</CardTitle>
          {result.deploymentScript && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyScript} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Script
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadAllScripts} className="gap-2">
                <Download className="h-4 w-4" />
                Download Script
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDeployToTarget}
                disabled={isDeploying}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isDeploying ? 'Deploying...' : 'Deploy to Target'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ObjectType)}>
          <TabsList className="grid w-full grid-cols-6">
            {(Object.entries(objectTypeConfig) as [ObjectType, typeof objectTypeConfig[ObjectType]][]).map(([type, config]) => {
              const Icon = config.icon;
              const counts = getCounts(type);

              return (
                <TabsTrigger key={type} value={type} className="gap-2 relative">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  {counts.total > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {counts.total}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.entries(objectTypeConfig) as [ObjectType, typeof objectTypeConfig[ObjectType]][]).map(([type]) => (
            <TabsContent key={type} value={type} className="mt-4">
              {renderDifferenceTable(
                result.differences[`${type}s` as keyof typeof result.differences] as SchemaObjectDifference[],
                type
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
