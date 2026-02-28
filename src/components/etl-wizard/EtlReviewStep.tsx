import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Database, ArrowRight, GitBranch } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import type { EtlWizardState } from './EtlWizard';

interface EtlReviewStepProps {
  state: EtlWizardState;
}

export function EtlReviewStep({ state }: EtlReviewStepProps) {
  const { getServerById } = useBackupStore();
  const sourceServer = state.sourceServerId ? getServerById(state.sourceServerId) : null;
  const targetServer = state.targetServerId ? getServerById(state.targetServerId) : null;
  const [relations, setRelations] = useState<{ referencedBy: string[]; references: string[] } | null>(null);

  useEffect(() => {
    if (!targetServer || !state.targetDatabaseName || !state.targetTable) {
      setRelations(null);
      return;
    }
    let cancelled = false;
    apiClient
      .getEtlTableRelations(
        {
          host: targetServer.host,
          port: targetServer.port,
          user: targetServer.username,
          password: targetServer.password,
          type: targetServer.databaseType,
        },
        state.targetDatabaseName,
        state.targetTable
      )
      .then((res) => {
        if (!cancelled && res.success) setRelations({ referencedBy: res.referencedBy, references: res.references });
        else if (!cancelled) setRelations(null);
      })
      .catch(() => {
        if (!cancelled) setRelations(null);
      });
    return () => { cancelled = true; };
  }, [targetServer, state.targetDatabaseName, state.targetTable]);

  const hasRelations = relations && (relations.referencedBy.length > 0 || relations.references.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review and run ETL.</p>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium">
                {sourceServer?.name ?? 'Source'} / {state.sourceDatabaseName ?? '?'} / {state.sourceTable ?? '?'}
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                {targetServer?.name ?? 'Target'} / {state.targetDatabaseName ?? '?'} / {state.targetTable ?? '?'}
              </span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Mode: <strong>{state.mode.toUpperCase()}</strong></p>
            {state.mode === 'etl' && (
              <p>
                Transform (before load): column map ({Object.keys(state.columnMap).length} target col{Object.keys(state.columnMap).length !== 1 ? 's' : ''})
                {state.filter.trim() ? <> · WHERE: <code className="text-xs bg-muted px-1 rounded">{state.filter.trim()}</code></> : ' · No WHERE (all rows)'}
              </p>
            )}
            {state.mode === 'elt' && state.postLoadSql && (
              <p>ELT: post-load SQL will run on target</p>
            )}
            <p>Batch size: {state.batchSize} · Clear target before load: {state.truncateFirst ? 'Yes (full replace)' : 'No (append)'}</p>
          </div>
          {hasRelations && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <GitBranch className="h-4 w-4" />
                Load order (parent/child)
              </div>
              {relations.references.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  This table references: <strong>{relations.references.join(', ')}</strong>. Load those tables first, then this one.
                </p>
              )}
              {relations.referencedBy.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  This table is a parent: child tables <strong>{relations.referencedBy.join(', ')}</strong> reference it. Load this table first, then those.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
