import { SchemaComparisonResult } from '@/types/backup.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitCompare, AlertTriangle, Plus, Minus, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ComparisonSummaryProps {
  result: SchemaComparisonResult;
  onReset: () => void;
}

export function ComparisonSummary({ result, onReset }: ComparisonSummaryProps) {
  const { summary, sourceServer, targetServer, sourceDatabase, targetDatabase, comparisonDate } = result;

  const stats = [
    {
      label: 'Missing in Target',
      value: summary.missingInTarget,
      icon: Minus,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Extra in Target',
      value: summary.extraInTarget,
      icon: Plus,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Modified',
      value: summary.modified,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Identical',
      value: summary.identical,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              <CardTitle>Comparison Summary</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{sourceServer.name}</Badge>
              <span>/</span>
              <span>{sourceDatabase}</span>
              <span className="mx-2">→</span>
              <Badge variant="outline">{targetServer.name}</Badge>
              <span>/</span>
              <span>{targetDatabase}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Compared on {format(comparisonDate, 'PPpp')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            New Comparison
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {summary.totalDifferences > 0 && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-500">
                  Schema Differences Detected
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Found {summary.totalDifferences} difference{summary.totalDifferences !== 1 ? 's' : ''} between source and target schemas.
                  Review the details below to understand the changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {summary.totalDifferences === 0 && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-500">
                  Schemas are Identical
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  No differences found between source and target schemas. The schemas are in sync.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
