import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ExportWizardState, ExportFormat } from './exportWizardTypes';
import {
  Table2,
  Code,
  FileText,
  FileSpreadsheet,
  Braces,
  FileCode,
  Database,
  Server as ServerIcon,
} from 'lucide-react';

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  excel: 'Excel (.xlsx)',
  json: 'JSON',
  xml: 'XML',
  sql: 'SQL INSERT',
};

interface ExportReviewStepProps {
  state: ExportWizardState;
}

export function ExportReviewStep({ state }: ExportReviewStepProps) {
  const sourceLabel =
    state.sourceType === 'table'
      ? state.tableName ?? '—'
      : state.query.trim().slice(0, 60) + (state.query.trim().length > 60 ? '…' : '');
  const formatLabel = FORMAT_LABELS[state.format];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your export settings. Click Export to run the query and download the file.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ServerIcon className="h-4 w-4" />
              Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Server:</span>{' '}
              {state.serverId ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Database:</span>{' '}
              {state.databaseName ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {state.sourceType === 'table' ? (
                <Table2 className="h-4 w-4" />
              ) : (
                <Code className="h-4 w-4" />
              )}
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Type:</span>{' '}
              {state.sourceType === 'table' ? 'Table' : 'Custom query'}
            </p>
            <p className="font-mono text-xs break-all">
              {sourceLabel || '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {state.format === 'csv' && <FileText className="h-4 w-4" />}
              {state.format === 'excel' && <FileSpreadsheet className="h-4 w-4" />}
              {state.format === 'json' && <Braces className="h-4 w-4" />}
              {state.format === 'xml' && <FileCode className="h-4 w-4" />}
              {state.format === 'sql' && <Database className="h-4 w-4" />}
              Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{formatLabel}</Badge>
            {state.format === 'csv' && (
              <p className="text-xs text-muted-foreground mt-2">
                Delimiter: {state.csvDelimiter === '\t' ? 'Tab' : state.csvDelimiter},{' '}
                headers: {state.includeHeaders ? 'yes' : 'no'}
              </p>
            )}
            {state.format === 'sql' && state.sqlInsertTableName && (
              <p className="text-xs text-muted-foreground mt-2">
                Table: {state.sqlInsertTableName}, batch: {state.sqlBatchSize}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
