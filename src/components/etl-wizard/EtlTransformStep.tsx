import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import type { EtlWizardState, EtlMode } from './EtlWizard';
import { Workflow, Database, Code, Zap, Eraser, Loader2, ListOrdered, HelpCircle, RefreshCw, Layers } from 'lucide-react';

interface EtlTransformStepProps {
  state: EtlWizardState;
  onUpdate: (updates: Partial<EtlWizardState>) => void;
}

/** Normalize for matching: strip schema (dbo.Column -> Column), remove brackets/quotes, lowercase, collapse spaces/underscores/dashes. */
function normalize(s: string): string {
  const name = typeof s !== 'string' ? '' : s.trim();
  const noSchema = name.includes('.') ? name.split('.').pop()! : name;
  return noSchema
    .toLowerCase()
    .replace(/[\[\]"']+/g, '')
    .replace(/[\s_\-]+/g, '');
}

/** Score how well source column matches target (0 = no match). One source = one target. */
function matchScore(target: string, source: string): number {
  if (target === source) return 100;
  const t = (target || '').toLowerCase().trim();
  const s = (source || '').toLowerCase().trim();
  if (t === s) return 95;
  const tn = normalize(target);
  const sn = normalize(source);
  if (!tn || !sn) return 0;
  if (tn === sn) return 90;
  if (s.includes(t) || t.includes(s)) return 70;
  if (sn.includes(tn) || tn.includes(sn)) return 60;
  if (tn.startsWith(sn) || sn.startsWith(tn)) return 40;
  return 0;
}

/** Build best column map: each target -> best unused source (by name similarity). Skips empty column names. */
function autoMapColumns(targetColumns: string[], sourceColumns: string[]): Record<string, string> {
  const used = new Set<string>();
  const map: Record<string, string> = {};
  const targets = targetColumns.filter((c) => c != null && String(c).trim() !== '');
  const sources = sourceColumns.filter((c) => c != null && String(c).trim() !== '');
  for (const target of targets) {
    let bestSource: string | null = null;
    let bestScore = 0;
    for (const source of sources) {
      if (used.has(source)) continue;
      const score = matchScore(target, source);
      if (score > bestScore) {
        bestScore = score;
        bestSource = source;
      }
    }
    if (bestSource != null) {
      map[target] = bestSource;
      used.add(bestSource);
    }
  }
  return map;
}

/** Map by position: 1st target ← 1st source, 2nd ← 2nd, etc. */
function mapByPosition(targetColumns: string[], sourceColumns: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const len = Math.min(targetColumns.length, sourceColumns.length);
  for (let i = 0; i < len; i++) {
    map[targetColumns[i]] = sourceColumns[i];
  }
  return map;
}

/** Matching columns: same name in both tables (case-insensitive). Map target col → source col. */
function matchingColumnsMap(targetColumns: string[], sourceColumns: string[]): Record<string, string> {
  const sourceLower = new Map<string, string>();
  for (const s of sourceColumns) sourceLower.set(s.toLowerCase(), s);
  const map: Record<string, string> = {};
  for (const target of targetColumns) {
    const src = sourceLower.get(target.toLowerCase());
    if (src != null) map[target] = src;
  }
  return map;
}

/** Parse "targetCol=sourceCol" lines into Record<target, source>. */
function parseColumnMapText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const target = line.slice(0, eq).trim();
      const source = line.slice(eq + 1).trim();
      if (target && source) out[target] = source;
    }
  }
  return out;
}

function columnMapToText(m: Record<string, string>): string {
  return Object.entries(m)
    .map(([target, source]) => `${target}=${source}`)
    .join('\n');
}

export function EtlTransformStep({ state, onUpdate }: EtlTransformStepProps) {
  const getServerById = useBackupStore((s) => s.getServerById);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<string[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  const canFetchColumns =
    state.mode === 'etl' &&
    !!state.sourceServerId &&
    !!state.sourceDatabaseName &&
    !!state.sourceTable &&
    !!state.targetServerId &&
    !!state.targetDatabaseName &&
    !!state.targetTable;

  const fetchColumns = useCallback(async () => {
    if (!canFetchColumns) return;
    setColumnsLoading(true);
    setColumnsError(null);
    try {
      const sourceServer = getServerById(state.sourceServerId!);
      const targetServer = getServerById(state.targetServerId!);
      if (!sourceServer || !targetServer) {
        setColumnsError('Source or target server not found');
        setSourceColumns([]);
        setTargetColumns([]);
        return;
      }
      const [srcRes, tgtRes] = await Promise.all([
        apiClient.getEtlTableColumns(
          {
            host: sourceServer.host,
            port: sourceServer.port,
            user: sourceServer.username,
            password: sourceServer.password,
            type: sourceServer.databaseType,
          },
          state.sourceDatabaseName!,
          state.sourceTable!
        ),
        apiClient.getEtlTableColumns(
          {
            host: targetServer.host,
            port: targetServer.port,
            user: targetServer.username,
            password: targetServer.password,
            type: targetServer.databaseType,
          },
          state.targetDatabaseName!,
          state.targetTable!
        ),
      ]);
      if (!srcRes.success) {
        setColumnsError(srcRes.error || 'Failed to load source columns');
        setSourceColumns([]);
      } else {
        setSourceColumns(srcRes.columns);
      }
      if (!tgtRes.success) {
        setColumnsError(tgtRes.error || 'Failed to load target columns');
        setTargetColumns([]);
      } else {
        setTargetColumns(tgtRes.columns);
      }
    } catch (e) {
      setColumnsError(e instanceof Error ? e.message : 'Failed to load columns');
      setSourceColumns([]);
      setTargetColumns([]);
    } finally {
      setColumnsLoading(false);
    }
  }, [canFetchColumns, state.sourceServerId, state.targetServerId, state.sourceDatabaseName, state.targetDatabaseName, state.sourceTable, state.targetTable, getServerById]);

  useEffect(() => {
    if (canFetchColumns) fetchColumns();
    else {
      setSourceColumns([]);
      setTargetColumns([]);
      setColumnsError(null);
    }
  }, [canFetchColumns, fetchColumns]);

  /** Matching columns: same name in both tables. Default ETL map to these when columns first load. */
  const matchingColumnsMapResult = useMemo(
    () => (sourceColumns.length > 0 && targetColumns.length > 0 ? matchingColumnsMap(targetColumns, sourceColumns) : {}),
    [sourceColumns, targetColumns]
  );
  const matchingColumnNames = Object.keys(matchingColumnsMapResult);

  /** Radix Select forbids value=""; filter out empty column names so we never pass them to SelectItem. */
  const sourceColumnsSafe = sourceColumns.filter((c) => c != null && String(c).trim() !== '');
  const targetColumnsSafe = targetColumns.filter((c) => c != null && String(c).trim() !== '');

  /** When columns load and no map set yet, default to matching columns only (for ETL). */
  useEffect(() => {
    if (sourceColumns.length === 0 || targetColumns.length === 0) return;
    if (Object.keys(state.columnMap).length > 0) return;
    const map = matchingColumnsMap(targetColumns, sourceColumns);
    if (Object.keys(map).length === 0) return;
    onUpdate({ columnMap: map });
  }, [sourceColumns, targetColumns, state.columnMap, onUpdate]);

  const handleAutoMap = () => {
    if (targetColumnsSafe.length === 0 || sourceColumnsSafe.length === 0) return;
    onUpdate({ columnMap: autoMapColumns(targetColumnsSafe, sourceColumnsSafe) });
  };

  const handleMapByPosition = () => {
    if (targetColumnsSafe.length === 0 || sourceColumnsSafe.length === 0) return;
    onUpdate({ columnMap: mapByPosition(targetColumnsSafe, sourceColumnsSafe) });
  };

  const handleMatchingColumns = () => {
    if (targetColumnsSafe.length === 0 || sourceColumnsSafe.length === 0) return;
    onUpdate({ columnMap: matchingColumnsMap(targetColumnsSafe, sourceColumnsSafe) });
  };

  const handleClear = () => {
    onUpdate({ columnMap: {} });
  };

  const columnMapText = columnMapToText(state.columnMap);
  const showMapUI = state.mode === 'etl' && targetColumns.length > 0 && !columnsLoading && !columnsError;
  const mappedCount = targetColumns.filter((c) => state.columnMap[c]).length;
  /** Show unmapped first so they're easy to fix. */
  const targetColumnsOrdered = [...targetColumnsSafe].sort((a, b) => {
    const aMapped = !!state.columnMap[a];
    const bMapped = !!state.columnMap[b];
    if (aMapped === bMapped) return 0;
    return aMapped ? 1 : -1;
  });

  const sourceTableLabel = state.sourceDatabaseName && state.sourceTable ? `${state.sourceDatabaseName}.${state.sourceTable}` : 'source table';
  const targetTableLabel = state.targetDatabaseName && state.targetTable ? `${state.targetDatabaseName}.${state.targetTable}` : 'target table';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">3. Column matching (after database + table selection)</p>
        <p className="mb-1">
          You gave database and selected tables: <strong>{sourceTableLabel}</strong> → <strong>{targetTableLabel}</strong>. Columns that exist in <strong>both</strong> tables (matching columns) are pre-selected for ETL. Add or change mappings as needed.
        </p>
        <p>
          <strong>ETL</strong>: map columns and filter rows here, then load. <strong>ELT</strong>: load as-is, then run SQL on the target (no column map).
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Workflow className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base">Pipeline mode</Label>
              <p className="text-xs text-muted-foreground">ETL = transform then load · ELT = load then transform in target DB</p>
            </div>
          </div>
          <RadioGroup
            value={state.mode}
            onValueChange={(v) => onUpdate({ mode: v as EtlMode })}
            className="flex gap-6"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="etl" id="mode-etl" />
              <span>ETL</span>
              <span className="text-xs text-muted-foreground">Extract → Transform → Load</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="elt" id="mode-elt" />
              <span>ELT</span>
              <span className="text-xs text-muted-foreground">Extract → Load → Transform (in target DB)</span>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {state.mode === 'etl' && (
        <>
          {columnsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading source and target columns…
            </div>
          )}
          {columnsError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Could not load column list</p>
              <p className="mt-1">{columnsError}</p>
              <p className="mt-2 text-muted-foreground">You can still enter column mappings manually in the text box below (e.g. <code className="text-xs">target_col=source_col</code> one per line). Your mappings and WHERE filter will be applied before load when you run.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { setColumnsError(null); fetchColumns(); }} className="mt-3 gap-2" disabled={columnsLoading}>
                <RefreshCw className={cn('h-4 w-4', columnsLoading && 'animate-spin')} />
                Retry loading columns
              </Button>
            </div>
          )}

          {showMapUI ? (
            <Card className="border-2 border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <Label className="text-base">Column matching: {state.sourceTable ?? 'source'} → {state.targetTable ?? 'target'}</Label>
                    <p className="text-xs text-muted-foreground">
                      For each <strong>target</strong> column (from {state.targetTable ?? 'target table'}), pick which <strong>source</strong> column (from {state.sourceTable ?? 'source table'}) to copy from. Use the buttons below to fill in one click.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleMatchingColumns} className="gap-2 border-green-500/50 text-green-700 dark:text-green-400">
                    <Layers className="h-4 w-4" />
                    Use matching columns
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={handleAutoMap} className="gap-2">
                    <Zap className="h-4 w-4" />
                    Auto-map by name
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleMapByPosition} className="gap-2">
                    <ListOrdered className="h-4 w-4" />
                    Map by position
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleClear} className="gap-2">
                    <Eraser className="h-4 w-4" />
                    Clear all
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">
                    {mappedCount} of {targetColumns.length} mapped
                    {matchingColumnNames.length > 0 && ` · ${matchingColumnNames.length} matching`}
                  </span>
                  <details className="ml-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground inline-flex items-center gap-1 list-none">
                      <HelpCircle className="h-3.5 w-3.5" /> How matching works
                    </summary>
                    <p className="text-xs text-muted-foreground mt-2 pl-5 space-y-1">
                      <strong>Use matching columns</strong>: Only columns that exist in both tables (same name). Pre-filled when you open this step.
                      <br />
                      <strong>Auto-map by name</strong>: Matches exact and similar names (e.g. FirstName ↔ First Name, user_id ↔ UserId).
                      <br />
                      <strong>Map by position</strong>: 1st target ← 1st source, 2nd ← 2nd, etc. Use when column order is the same.
                    </p>
                  </details>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Target column → pick source (unmapped shown first)</p>
                    <ScrollArea className="h-[280px] rounded-md border bg-muted/30 p-2">
                      <div className="space-y-2">
                        {targetColumnsOrdered.map((col) => {
                          const mapped = !!state.columnMap[col];
                          return (
                            <div key={col} className={cn('flex items-center gap-2 rounded px-2 py-1', !mapped && 'bg-amber-500/10')}>
                              <span className={cn('text-sm truncate flex-1 min-w-0', !mapped && 'font-medium')} title={col}>{col}</span>
                              <Select
                                value={state.columnMap[col] && sourceColumnsSafe.includes(state.columnMap[col]) ? state.columnMap[col] : '__none__'}
                                onValueChange={(val) => {
                                  const next = { ...state.columnMap };
                                  if (val && val !== '__none__') next[col] = val; else delete next[col];
                                  onUpdate({ columnMap: next });
                                }}
                              >
                                <SelectTrigger className="w-[180px] shrink-0 h-8 text-xs">
                                  <SelectValue placeholder="Select source…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— None —</SelectItem>
                                  {sourceColumnsSafe.map((src) => (
                                    <SelectItem key={src} value={src}>{src}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="hidden md:block self-center text-muted-foreground">→</div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Source columns (from)</p>
                    <ScrollArea className="h-[280px] rounded-md border bg-muted/30 p-2">
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {sourceColumnsSafe.map((c) => (
                          <li key={c} className="truncate" title={c}>{c || '\u2014'}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground text-xs">Advanced: edit mapping as text</summary>
                  <Textarea
                    placeholder="targetCol=sourceCol (one per line)"
                    value={columnMapText}
                    onChange={(e) => onUpdate({ columnMap: parseColumnMapText(e.target.value) })}
                    rows={3}
                    className="font-mono text-xs mt-2"
                  />
                </details>
              </CardContent>
            </Card>
          ) : !columnsLoading && !columnsError && canFetchColumns ? null : (
            !columnsLoading && (
              <Card className="border-2 border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-5 space-y-4">
                  <Label className="text-base">Column matching: target column ← source column</Label>
                  <p className="text-xs text-muted-foreground">One line per mapping: <code>targetColumn=sourceColumn</code> (columns from the tables you selected in Step 1). Leave empty for 1:1 copy when names match.</p>
                  <Textarea
                    placeholder={'e.g.\nnew_id=id\nfull_name=name\ncreated=created_at'}
                    value={columnMapText}
                    onChange={(e) => onUpdate({ columnMap: parseColumnMapText(e.target.value) })}
                    rows={5}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            )
          )}

          <Card className="border border-border">
            <CardContent className="p-5 space-y-2">
              <Label className="text-base">Filter (optional)</Label>
              <p className="text-xs text-muted-foreground">WHERE clause applied at extract (e.g. status = &apos;active&apos;). Only rows matching this condition are read from the source and loaded.</p>
              <Input
                placeholder="e.g. status = 'active' AND created_at > '2024-01-01'"
                value={state.filter}
                onChange={(e) => onUpdate({ filter: e.target.value })}
                className="font-mono"
              />
            </CardContent>
          </Card>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground mb-1">Applied before load (ETL transform)</p>
            <p className="text-muted-foreground">
              Column mapping: <strong>{Object.keys(state.columnMap).length}</strong> target column(s) from source
              {Object.keys(state.columnMap).length > 0 && ' · '}
              {state.filter.trim() ? (
                <>WHERE filter: <code className="text-xs bg-muted px-1 rounded">{state.filter.trim()}</code></>
              ) : (
                <>No WHERE filter (all rows)</>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">These settings are applied during extract and before writing to the target.</p>
          </div>
        </>
      )}

      {state.mode === 'elt' && (
        <Card className="border-2 border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <div>
                <Label className="text-base">Post-load SQL (optional)</Label>
                <p className="text-xs text-muted-foreground">Run this SQL on the target database after data is loaded (e.g. merge into final table, call procedure)</p>
              </div>
            </div>
            <Textarea
              placeholder={'e.g.\nINSERT INTO final_table SELECT * FROM loaded_table;\n-- or EXEC sp_TransformStaging;'}
              value={state.postLoadSql}
              onChange={(e) => onUpdate({ postLoadSql: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
