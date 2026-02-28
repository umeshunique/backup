import { useEffect, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, ArrowRight } from 'lucide-react';
import type { EtlWizardState } from './EtlWizard';

interface EtlSourceTargetStepProps {
  state: EtlWizardState;
  onUpdate: (updates: Partial<EtlWizardState>) => void;
}

export function EtlSourceTargetStep({ state, onUpdate }: EtlSourceTargetStepProps) {
  const { servers, getDatabasesForServer, loadDatabasesForServer, loadDatabaseSchema, databaseSchemas } = useBackupStore();

  const sourceDbs = state.sourceServerId ? getDatabasesForServer(state.sourceServerId) : [];
  const targetDbs = state.targetServerId ? getDatabasesForServer(state.targetServerId) : [];

  const sourceSchema = state.sourceServerId && state.sourceDatabaseName
    ? (databaseSchemas[state.sourceServerId] || []).find((s) => s.name === state.sourceDatabaseName)
    : null;
  const targetSchema = state.targetServerId && state.targetDatabaseName
    ? (databaseSchemas[state.targetServerId] || []).find((s) => s.name === state.targetDatabaseName)
    : null;

  const sourceTables = sourceSchema?.tables ?? [];
  const targetTables = targetSchema?.tables ?? [];

  /** Table names that exist in both source and target DB — default selection. */
  const matchingTableNames = useMemo(() => {
    const sourceNames = new Set(sourceTables.map((t) => t.name));
    return targetTables.map((t) => t.name).filter((name) => sourceNames.has(name)).sort();
  }, [sourceTables, targetTables]);

  /** Default table selection when both DBs are chosen and no tables selected yet. Prefer matching tables; else first in each list. */
  useEffect(() => {
    if (!state.sourceDatabaseName || !state.targetDatabaseName || state.sourceTable != null || state.targetTable != null) return;
    if (matchingTableNames.length > 0) {
      onUpdate({ sourceTable: matchingTableNames[0], targetTable: matchingTableNames[0] });
      return;
    }
    if (sourceTables.length > 0 && targetTables.length > 0) {
      onUpdate({ sourceTable: sourceTables[0].name, targetTable: targetTables[0].name });
    }
  }, [state.sourceDatabaseName, state.targetDatabaseName, matchingTableNames, sourceTables, targetTables, state.sourceTable, state.targetTable, onUpdate]);

  /** Source table list: matching tables first, then rest. */
  const sourceTablesOrdered = useMemo(() => {
    const matchingSet = new Set(matchingTableNames);
    const rest = sourceTables.filter((t) => !matchingSet.has(t.name));
    const match = sourceTables.filter((t) => matchingSet.has(t.name));
    return [...match, ...rest];
  }, [sourceTables, matchingTableNames]);

  const targetTablesOrdered = useMemo(() => {
    const matchingSet = new Set(matchingTableNames);
    const rest = targetTables.filter((t) => !matchingSet.has(t.name));
    const match = targetTables.filter((t) => matchingSet.has(t.name));
    return [...match, ...rest];
  }, [targetTables, matchingTableNames]);

  useEffect(() => {
    if (state.sourceServerId) loadDatabasesForServer(state.sourceServerId);
  }, [state.sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (state.targetServerId) loadDatabasesForServer(state.targetServerId);
  }, [state.targetServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (state.sourceServerId && state.sourceDatabaseName) {
      loadDatabaseSchema(state.sourceServerId, state.sourceDatabaseName);
    }
  }, [state.sourceServerId, state.sourceDatabaseName, loadDatabaseSchema]);

  useEffect(() => {
    if (state.targetServerId && state.targetDatabaseName) {
      loadDatabaseSchema(state.targetServerId, state.targetDatabaseName);
    }
  }, [state.targetServerId, state.targetDatabaseName, loadDatabaseSchema]);

  const sourceServer = servers.find((s) => s.id === state.sourceServerId);
  const targetServer = servers.find((s) => s.id === state.targetServerId);

  const isSameTable =
    state.sourceServerId &&
    state.targetServerId &&
    state.sourceDatabaseName &&
    state.targetDatabaseName &&
    state.sourceTable &&
    state.targetTable &&
    state.sourceServerId === state.targetServerId &&
    state.sourceDatabaseName === state.targetDatabaseName &&
    state.sourceTable === state.targetTable;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-foreground mb-2">Flow: Database → Table matching → (later) Column matching</p>
        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Give database</strong> — Pick source server + database, target server + database.</li>
          <li><strong className="text-foreground">Table selection</strong> — Pick source table and target table. Tables that exist in both DBs (matching) are listed first and selected by default.</li>
          <li><strong className="text-foreground">Column matching</strong> — Done in the next step (map columns between the two tables).</li>
        </ol>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] items-start">
        {/* Source */}
        <Card className="border-2 border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2.5">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">Source</h3>
                <p className="text-xs text-muted-foreground">1. Database · 2. Table matching</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Server</Label>
              <Select
                value={state.sourceServerId ?? ''}
                onValueChange={(v) =>
                  onUpdate({
                    sourceServerId: v || null,
                    sourceDatabaseName: null,
                    sourceTable: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.filter((s) => s.databaseType === 'mysql' || s.databaseType === 'mssql').map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.databaseType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>1. Database</Label>
              <Select
                value={state.sourceDatabaseName ?? ''}
                onValueChange={(v) => onUpdate({ sourceDatabaseName: v || null, sourceTable: null })}
                disabled={!state.sourceServerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {sourceDbs.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>2. Table selection (source table)</Label>
              {matchingTableNames.length > 0 ? (
                <p className="text-xs text-muted-foreground">Matching tables (in both DBs) listed first; default is first match.</p>
              ) : sourceTables.length > 0 && targetTables.length > 0 ? (
                <p className="text-xs text-muted-foreground">No matching table names in both DBs; first table in each list is selected by default.</p>
              ) : null}
              <Select
                value={state.sourceTable ?? ''}
                onValueChange={(v) => onUpdate({ sourceTable: v || null })}
                disabled={!state.sourceDatabaseName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTablesOrdered.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {matchingTableNames.includes(t.name) ? `${t.name} (matching)` : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center pt-8">
          <ArrowRight className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Target */}
        <Card className="border-2 border-green-500/20 bg-green-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/20 p-2.5">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">Target</h3>
                <p className="text-xs text-muted-foreground">1. Database · 2. Table matching</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Server</Label>
              <Select
                value={state.targetServerId ?? ''}
                onValueChange={(v) =>
                  onUpdate({
                    targetServerId: v || null,
                    targetDatabaseName: null,
                    targetTable: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.filter((s) => s.databaseType === 'mysql' || s.databaseType === 'mssql').map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.databaseType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>1. Database</Label>
              <Select
                value={state.targetDatabaseName ?? ''}
                onValueChange={(v) => onUpdate({ targetDatabaseName: v || null, targetTable: null })}
                disabled={!state.targetServerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {targetDbs.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>2. Table selection (target table)</Label>
              {matchingTableNames.length > 0 ? (
                <p className="text-xs text-muted-foreground">Matching tables (in both DBs) listed first; default is first match.</p>
              ) : sourceTables.length > 0 && targetTables.length > 0 ? (
                <p className="text-xs text-muted-foreground">No matching table names in both DBs; first table in each list is selected by default.</p>
              ) : null}
              <Select
                value={state.targetTable ?? ''}
                onValueChange={(v) => onUpdate({ targetTable: v || null })}
                disabled={!state.targetDatabaseName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {targetTablesOrdered.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {matchingTableNames.includes(t.name) ? `${t.name} (matching)` : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {isSameTable && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Source and target are the same table. Choose different source/target or table.
        </p>
      )}
    </div>
  );
}
