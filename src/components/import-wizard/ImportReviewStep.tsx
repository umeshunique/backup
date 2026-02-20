import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackupStore } from '@/store/backupStore';
import type { ImportWizardState, DuplicateMode } from './importWizardTypes';
import { FileText, Database, Table2, ListOrdered } from 'lucide-react';

interface ImportReviewStepProps {
  state: ImportWizardState;
}

const duplicateLabels: Record<DuplicateMode, string> = {
  skip: 'Skip duplicate rows',
  update: 'Update existing rows',
  replace: 'Replace table data',
  fail: 'Fail on duplicate',
};

export function ImportReviewStep({ state }: ImportReviewStepProps) {
  const { servers } = useBackupStore();
  const { parsedFile, serverId, databaseName, tableName, columnMapping, duplicateMode } = state;
  const server = servers.find((s) => s.id === serverId);
  const serverName = server?.name ?? serverId ?? '—';
  const mappedCount = parsedFile ? Object.values(columnMapping).filter((v) => v !== '').length : 0;

  if (!parsedFile) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review the import settings. Click Start import to run the import.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Source file
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{parsedFile.fileName}</p>
            <p className="text-muted-foreground">
              {parsedFile.headers.length} columns, {parsedFile.rows.length} rows
            </p>
            <Badge variant="secondary">{parsedFile.fileType === 'excel' ? 'Excel' : 'CSV'}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">Server: {serverName}</p>
            <p className="font-medium">Database: {databaseName ?? '—'}</p>
            <p className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Table: {tableName ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-4 w-4 text-primary" />
            Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Column mapping:</span>{' '}
            {mappedCount} of {parsedFile.headers.length} columns mapped
          </p>
          <p>
            <span className="text-muted-foreground">Duplicate handling:</span>{' '}
            {duplicateLabels[duplicateMode]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
