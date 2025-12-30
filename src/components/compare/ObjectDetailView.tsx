import { SchemaObjectDifference, ColumnDifference } from '@/types/backup.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ObjectDetailViewProps {
  difference: SchemaObjectDifference;
  onClose: () => void;
}

export function ObjectDetailView({ difference, onClose }: ObjectDetailViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDownloadScript = () => {
    if (!difference.deploymentScript) return;

    const blob = new Blob([difference.deploymentScript], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${difference.name}_deployment.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderColumnComparison = () => {
    if (!difference.columnDifferences || difference.columnDifferences.length === 0) {
      return (
        <Alert>
          <AlertDescription>No column-level differences found.</AlertDescription>
        </Alert>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Source Value</TableHead>
            <TableHead>Target Value</TableHead>
            <TableHead>Change Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {difference.columnDifferences.map((colDiff, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-sm font-medium">{colDiff.columnName}</TableCell>
              <TableCell className="text-sm">{colDiff.field}</TableCell>
              <TableCell className="font-mono text-sm">
                {colDiff.sourceValue?.toString() || <span className="text-muted-foreground">null</span>}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {colDiff.targetValue?.toString() || <span className="text-muted-foreground">null</span>}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    colDiff.changeType === 'added'
                      ? 'default'
                      : colDiff.changeType === 'removed'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {colDiff.changeType}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMetadataComparison = () => {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Source Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(difference.sourceMetadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(difference.targetMetadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDeploymentScript = () => {
    if (!difference.deploymentScript) {
      return (
        <Alert>
          <AlertDescription>No deployment script available for this object.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            SQL script to apply changes from source to target
          </p>
          <Button size="sm" variant="outline" onClick={handleDownloadScript} className="gap-2">
            <Download className="h-4 w-4" />
            Download Script
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <pre className="text-xs p-4 bg-slate-950 text-green-400 rounded-lg overflow-auto max-h-[500px] font-mono">
              {difference.deploymentScript}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <CardTitle className="text-lg font-mono">{difference.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{difference.details}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase">
              {difference.type}
            </Badge>
            <Badge
              variant={
                difference.differenceType === 'missing'
                  ? 'destructive'
                  : difference.differenceType === 'extra'
                  ? 'secondary'
                  : difference.differenceType === 'modified'
                  ? 'default'
                  : 'outline'
              }
            >
              {difference.differenceType}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {difference.type === 'table' && difference.columnDifferences && (
                <TabsTrigger value="columns">
                  Columns ({difference.columnDifferences.length})
                </TabsTrigger>
              )}
              {difference.deploymentScript && (
                <TabsTrigger value="script" className="gap-2">
                  <Code className="h-3 w-3" />
                  Deployment Script
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {renderMetadataComparison()}
            </TabsContent>

            {difference.type === 'table' && difference.columnDifferences && (
              <TabsContent value="columns" className="mt-4">
                {renderColumnComparison()}
              </TabsContent>
            )}

            {difference.deploymentScript && (
              <TabsContent value="script" className="mt-4">
                {renderDeploymentScript()}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
