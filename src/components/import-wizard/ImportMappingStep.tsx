import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import type { DatabaseSchema, DatabaseTable, TableColumn } from '@/types/backup.types';
import type { ImportWizardState, ColumnMapping } from './importWizardTypes';
import { EnvironmentBadge } from '@/components/shared';
import { Database, Table2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportMappingStepProps {
  state: Pick<ImportWizardState, 'parsedFile' | 'serverId' | 'databaseName' | 'tableName' | 'columnMapping'>;
  onUpdate: (updates: Partial<ImportWizardState>) => void;
}

const SKIP = '__skip__';

export function ImportMappingStep({ state, onUpdate }: ImportMappingStepProps) {
  const { servers, getDatabasesForServer, loadDatabasesForServer } = useBackupStore();
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const parsedFile = state.parsedFile;
  const server = servers.find((s) => s.id === state.serverId);
  const databases = state.serverId ? getDatabasesForServer(state.serverId) : [];
  const selectedTable = schema?.tables?.find((t) => t.name === state.tableName);
  const tableColumns: TableColumn[] = selectedTable?.columns ?? [];

  useEffect(() => {
    if (state.serverId) loadDatabasesForServer(state.serverId);
  }, [state.serverId, loadDatabasesForServer]);

  useEffect(() => {
    if (!state.serverId || !state.databaseName || !server) {
      setSchema(null);
      return;
    }
    setSchemaLoading(true);
    setSchemaError(null);
    apiClient
      .getDatabaseSchema(
        {
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database: state.databaseName,
          type: server.databaseType,
        },
        state.databaseName
      )
      .then((res) => {
        if (res.success && res.schema) setSchema(res.schema as unknown as DatabaseSchema);
        else setSchema(null);
      })
      .catch((err) => {
        setSchemaError(err instanceof Error ? err.message : 'Failed to load schema.');
        setSchema(null);
      })
      .finally(() => setSchemaLoading(false));
  }, [state.serverId, state.databaseName, server]);

  // Initialize column mapping when file or table changes
  useEffect(() => {
    if (!parsedFile?.headers?.length) return;
    const current = state.columnMapping;
    const next: ColumnMapping = {};
    for (const h of parsedFile.headers) {
      next[h] = current[h] ?? '';
    }
    onUpdate({ columnMapping: next });
  }, [parsedFile?.headers?.join(',') ?? '', state.tableName]);

  const setMapping = (fileHeader: string, tableCol: string) => {
    onUpdate({
      columnMapping: { ...state.columnMapping, [fileHeader]: tableCol === SKIP ? '' : tableCol },
    });
  };

  if (!parsedFile) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select the target server, database, and table. Map each file column to a table column or skip it.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Server</Label>
              <Select
                value={state.serverId ?? ''}
                onValueChange={(v) =>
                  onUpdate({ serverId: v || null, databaseName: null, tableName: null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <EnvironmentBadge environment={s.environment} size="sm" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Database</Label>
              <Select
                value={state.databaseName ?? ''}
                onValueChange={(v) => onUpdate({ databaseName: v || null, tableName: null })}
                disabled={!state.serverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Table</Label>
              <Select
                value={state.tableName ?? ''}
                onValueChange={(v) => onUpdate({ tableName: v || null })}
                disabled={!state.databaseName || schemaLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={schemaLoading ? 'Loading…' : 'Select table'} />
                </SelectTrigger>
                <SelectContent>
                  {schema?.tables?.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      <span className="flex items-center gap-2">
                        <Table2 className="h-3.5 w-3" />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schemaError && (
                <p className="text-xs text-destructive">{schemaError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Column mapping</CardTitle>
            <CardDescription>
              Map file columns to table columns. Unmapped columns are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!state.tableName ? (
              <p className="text-sm text-muted-foreground">Select a table to see mapping options.</p>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {parsedFile.headers.map((header) => (
                  <div key={header} className="flex items-center gap-2">
                    <span className="text-sm font-medium min-w-[120px] truncate" title={header}>
                      {header || '(empty)'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={state.columnMapping[header] === '' ? SKIP : state.columnMapping[header] ?? SKIP}
                      onValueChange={(v) => setMapping(header, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>Skip</SelectItem>
                        {tableColumns.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            <span className="flex items-center gap-2">
                              {col.name}
                              <span className="text-muted-foreground font-normal">
                                ({col.dataType})
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
