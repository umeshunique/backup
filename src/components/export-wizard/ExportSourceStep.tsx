import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBackupStore } from '@/store/backupStore';
import type { ExportWizardState, ExportSourceType } from './exportWizardTypes';
import { Table2, Code, Server as ServerIcon, Database } from 'lucide-react';

interface ExportSourceStepProps {
  state: Pick<
    ExportWizardState,
    'sourceType' | 'serverId' | 'databaseName' | 'tableName' | 'query'
  >;
  onUpdate: (updates: Partial<ExportWizardState>) => void;
}

export function ExportSourceStep({ state, onUpdate }: ExportSourceStepProps) {
  const {
    servers,
    loadDatabasesForServer,
    getDatabasesForServer,
    loadDatabaseSchema,
    getDatabasesForServer: getSchemas,
  } = useBackupStore();
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tables, setTables] = useState<string[]>([]);

  const databases = state.serverId ? getDatabasesForServer(state.serverId) ?? [] : [];

  useEffect(() => {
    if (!state.serverId) return;
    setLoadingDatabases(true);
    loadDatabasesForServer(state.serverId).finally(() => setLoadingDatabases(false));
  }, [state.serverId, loadDatabasesForServer]);

  useEffect(() => {
    if (!state.serverId || !state.databaseName) {
      setTables([]);
      return;
    }
    setLoadingTables(true);
    loadDatabaseSchema(state.serverId, state.databaseName)
      .then(() => {
        const schemas = getSchemas(state.serverId!);
        const dbSchema = schemas?.find((s) => s.name === state.databaseName);
        const tableList = dbSchema?.tables ?? [];
        return tableList.map((t) => t.name);
      })
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [state.serverId, state.databaseName, loadDatabaseSchema, getSchemas]);

  const setSourceType = (value: ExportSourceType) => {
    onUpdate({ sourceType: value });
    if (value === 'query') onUpdate({ tableName: null });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose to export a full table or the results of a custom SQL query.
      </p>

      <RadioGroup
        value={state.sourceType}
        onValueChange={(v) => setSourceType(v as ExportSourceType)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <RadioGroupItem value="table" id="source-table" className="mt-1" />
          <div className="flex gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Table2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">Export table</p>
              <p className="text-sm text-muted-foreground">
                Export all rows from a single table (SELECT *).
              </p>
            </div>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <RadioGroupItem value="query" id="source-query" className="mt-1" />
          <div className="flex gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Code className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium">Export query results</p>
              <p className="text-sm text-muted-foreground">
                Run a custom SQL query and export the result set.
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ServerIcon className="h-4 w-4" />
            Server
          </Label>
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
                  {s.name} ({s.host}:{s.port})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </Label>
          <Select
            value={state.databaseName ?? ''}
            onValueChange={(v) => onUpdate({ databaseName: v || null, tableName: null })}
            disabled={!state.serverId || loadingDatabases}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingDatabases ? 'Loading…' : 'Select database'}
              />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db.name} value={db.name}>
                  {db.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.sourceType === 'table' && (
        <div className="space-y-2">
          <Label>Table</Label>
          <Select
            value={state.tableName ?? ''}
            onValueChange={(v) => onUpdate({ tableName: v || null })}
            disabled={!state.databaseName || loadingTables}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingTables ? 'Loading…' : 'Select table'}
              />
            </SelectTrigger>
            <SelectContent>
              {tables.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.sourceType === 'query' && (
        <div className="space-y-2">
          <Label>SQL query</Label>
          <Textarea
            placeholder="SELECT * FROM my_table WHERE ..."
            value={state.query}
            onChange={(e) => onUpdate({ query: e.target.value })}
            className="min-h-[160px] font-mono text-sm"
            disabled={!state.databaseName}
          />
          {!state.databaseName && (
            <p className="text-xs text-muted-foreground">
              Select a server and database first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
