import { useState, useMemo, Fragment } from 'react';
import {
  SchemaComparisonResult,
  SchemaObjectDifference,
  DifferenceType,
  ObjectType,
} from '@/types/backup.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Database,
  FileCode,
  Eye,
  Zap,
  Code2,
  Calendar,
  RefreshCw,
  Copy,
  Download,
  Play,
  ArrowRight,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/services/apiClient';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ComparisonBuildResultProps {
  result: SchemaComparisonResult;
  onReset: () => void;
}

type OperationType = 'Create' | 'Update' | 'Drop';
type StatusGroup = 'Only in Source' | 'Different' | 'Only in Target';

interface ComparisonRow {
  id: string;
  objectType: ObjectType;
  sourceObject: string;
  operation: OperationType;
  targetObject: string;
  difference: SchemaObjectDifference;
  statusGroup: StatusGroup;
}

const objectTypeConfig: Record<
  ObjectType,
  { icon: typeof Database; label: string; key: keyof SchemaComparisonResult['differences'] }
> = {
  table: { icon: Database, label: 'Tables', key: 'tables' },
  procedure: { icon: Code2, label: 'Procedures', key: 'procedures' },
  view: { icon: Eye, label: 'Views', key: 'views' },
  function: { icon: FileCode, label: 'Functions', key: 'functions' },
  trigger: { icon: Zap, label: 'Triggers', key: 'triggers' },
  event: { icon: Calendar, label: 'Events', key: 'events' },
};

const OBJECT_TYPES: ObjectType[] = ['table', 'procedure', 'view', 'function', 'trigger', 'event'];

function flattenDifferences(result: SchemaComparisonResult): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  let id = 0;

  (OBJECT_TYPES as ObjectType[]).forEach((objectType) => {
    const key = objectType === 'table' ? 'tables' : `${objectType}s`;
    const list = (result.differences as Record<string, SchemaObjectDifference[]>)[key] || [];
    list.forEach((diff) => {
      if (diff.differenceType === 'identical') return;
      const rowId = `row-${++id}-${diff.name}-${diff.differenceType}`;
      if (diff.differenceType === 'missing') {
        rows.push({
          id: rowId,
          objectType,
          sourceObject: diff.name,
          operation: 'Create',
          targetObject: '—',
          difference: diff,
          statusGroup: 'Only in Source',
        });
      } else if (diff.differenceType === 'modified') {
        rows.push({
          id: rowId,
          objectType,
          sourceObject: diff.name,
          operation: 'Update',
          targetObject: diff.name,
          difference: diff,
          statusGroup: 'Different',
        });
      } else if (diff.differenceType === 'extra') {
        rows.push({
          id: rowId,
          objectType,
          sourceObject: '—',
          operation: 'Drop',
          targetObject: diff.name,
          difference: diff,
          statusGroup: 'Only in Target',
        });
      }
    });
  });

  return rows;
}

function getTypeLabel(type: ObjectType): string {
  return objectTypeConfig[type]?.label ?? type;
}

export function ComparisonBuildResult({ result, onReset }: ComparisonBuildResultProps) {
  const [objectTypeFilter, setObjectTypeFilter] = useState<Record<ObjectType, boolean>>(
    OBJECT_TYPES.reduce((acc, t) => ({ ...acc, [t]: true }), {} as Record<ObjectType, boolean>
  ));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const allRows = useMemo(() => flattenDifferences(result), [result]);
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => objectTypeFilter[r.objectType]);
  }, [allRows, objectTypeFilter]);

  const selectedCount = useMemo(() => {
    return filteredRows.filter((r) => selectedIds.has(r.id)).length;
  }, [filteredRows, selectedIds]);

  const toggleObjectType = (type: ObjectType) => {
    setObjectTypeFilter((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInGroup = (group: StatusGroup, checked: boolean) => {
    const inGroup = filteredRows.filter((r) => r.statusGroup === group);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      inGroup.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });
  };

  const focusedRow = focusedRowId ? filteredRows.find((r) => r.id === focusedRowId) : null;

  const handleCopyScript = async () => {
    if (!result.deploymentScript) return;
    try {
      await navigator.clipboard.writeText(result.deploymentScript);
      toast({ title: 'Copied', description: 'Deployment script copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownloadScript = () => {
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

  const [isDeploying, setIsDeploying] = useState(false);
  const [showProdConfirm, setShowProdConfirm] = useState(false);
  const [prodConfirmText, setProdConfirmText] = useState('');
  const isTargetProduction = result.targetServer?.environment === 'production';
  const PROD_CONFIRM_PHRASE = 'DEPLOY TO PRODUCTION';

  const runDeploy = async () => {
    if (!result.deploymentScript) return;
    setIsDeploying(true);
    try {
      const targetServer = result.targetServer;
      if (!targetServer) throw new Error('Target server not found');
      const deployResult = await apiClient.executeDeploymentScript({
        host: targetServer.host,
        port: targetServer.port,
        user: targetServer.username,
        password: targetServer.password,
        database: result.targetDatabase,
        type: targetServer.databaseType,
        script: result.deploymentScript,
      });
      if (!deployResult.success) {
        toast({
          title: 'Deployment Failed',
          description: deployResult.backupPath ? `Backup: ${deployResult.backupPath}` : 'See console',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `Deployed. Backup: ${deployResult.backupPath}`,
        });
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Deploy failed',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
      setShowProdConfirm(false);
      setProdConfirmText('');
    }
  };

  const handleSynchronize = () => {
    if (!result.deploymentScript) return;
    if (isTargetProduction) {
      setShowProdConfirm(true);
      setProdConfirmText('');
    } else {
      runDeploy();
    }
  };

  const canConfirmProd = prodConfirmText.trim().toUpperCase() === PROD_CONFIRM_PHRASE;

  const groups: StatusGroup[] = ['Only in Source', 'Different', 'Only in Target'];
  const groupLabels: Record<StatusGroup, string> = {
    'Only in Source': 'Only in Source',
    'Different': 'Different',
    'Only in Target': 'Only in Target',
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            New comparison
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyScript}
            disabled={!result.deploymentScript}
            className="gap-2"
          >
            <Copy className="h-3 w-3" />
            Copy script
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadScript}
            disabled={!result.deploymentScript}
            className="gap-2"
          >
            <Download className="h-3 w-3" />
            Download script
          </Button>
          <Button
            size="sm"
            onClick={handleSynchronize}
            disabled={!result.deploymentScript || isDeploying}
            className="gap-2"
          >
            <Play className="h-3 w-3" />
            {isDeploying ? 'Deploying...' : 'Synchronize...'}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Group by: Status</span>
          <Filter className="h-4 w-4" />
        </div>
      </div>

      {/* Header: Source → Target, X of Y objects selected */}
      <div className="flex items-center gap-3 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{result.sourceServer.name}</span>
          <span className="text-muted-foreground text-sm truncate max-w-[180px]" title={result.sourceDatabase}>
            {result.sourceDatabase}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{result.targetServer.name}</span>
          <span className="text-muted-foreground text-sm truncate max-w-[180px]" title={result.targetDatabase}>
            {result.targetDatabase}
          </span>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {selectedCount} of {filteredRows.length} objects selected
        </span>
      </div>

      {/* Object type filters (like Database Explorer) */}
      <div className="flex flex-wrap items-center gap-4 py-2 border-b bg-muted/30 px-3 rounded-md">
        <span className="text-xs font-medium text-muted-foreground">Object types:</span>
        {OBJECT_TYPES.map((type) => {
          const config = objectTypeConfig[type];
          const Icon = config.icon;
          const count = allRows.filter((r) => r.objectType === type).length;
          return (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={objectTypeFilter[type]}
                onCheckedChange={() => toggleObjectType(type)}
              />
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span>{config.label}</span>
              {count > 0 && (
                <span className="text-muted-foreground text-xs">({count})</span>
              )}
            </label>
          );
        })}
      </div>

      {/* Grid: Group by Status, columns Type | Source Object | Operation | Target Object */}
      <div className="flex-1 min-h-0 overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead>Source Object</TableHead>
              <TableHead className="w-24">Operation</TableHead>
              <TableHead>Target Object</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const groupRows = filteredRows.filter((r) => r.statusGroup === group);
              if (groupRows.length === 0) return null;
              const allChecked = groupRows.every((r) => selectedIds.has(r.id));
              return (
                <Fragment key={group}>
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={5} className="py-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={(checked) =>
                            toggleAllInGroup(group, checked === true)
                          }
                        />
                        <span>{groupLabels[group]}</span>
                        <span className="text-muted-foreground font-normal text-xs">
                          ({groupRows.filter((r) => selectedIds.has(r.id)).length} of {groupRows.length} selected)
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {groupRows.map((row: ComparisonRow) => {
                    const Icon = objectTypeConfig[row.objectType].icon;
                    const isSelected = selectedIds.has(row.id);
                    const isFocused = focusedRowId === row.id;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50',
                          isFocused && 'bg-primary/5'
                        )}
                        onClick={() => setFocusedRowId(row.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(row.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                            <span className="capitalize">{getTypeLabel(row.objectType)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.sourceObject}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              row.operation === 'Create' && 'bg-green-500/15 text-green-700 dark:text-green-400',
                              row.operation === 'Update' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                              row.operation === 'Drop' && 'bg-red-500/15 text-red-700 dark:text-red-400'
                            )}
                          >
                            {row.operation}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.targetObject}</TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bottom: Split DDL pane — Source DDL | Target DDL */}
      <div className="grid grid-cols-2 gap-px border rounded-b-md bg-border mt-2 flex-shrink-0 min-h-[220px] max-h-[360px]">
        <Card className="rounded-none border-0 shadow-none">
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-b">
              Source DDL
              {focusedRow && (
                <span className="ml-2 font-mono">{focusedRow.sourceObject !== '—' ? focusedRow.sourceObject : focusedRow.targetObject}</span>
              )}
            </div>
            <pre className="flex-1 overflow-auto text-xs p-3 bg-slate-950 text-green-400 font-mono rounded mt-1 min-h-0">
              {focusedRow?.difference?.deploymentScript ?? (focusedRow?.difference?.differenceType === 'extra'
                ? '—'
                : 'Select an object above to view DDL')}
            </pre>
          </CardContent>
        </Card>
        <Card className="rounded-none border-0 shadow-none">
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-b">
              Target
              {focusedRow && (
                <span className="ml-2 font-mono">{focusedRow.targetObject !== '—' ? focusedRow.targetObject : focusedRow.sourceObject}</span>
              )}
            </div>
            <pre className="flex-1 overflow-auto text-xs p-3 bg-muted font-mono rounded mt-1 min-h-0 text-muted-foreground">
              {!focusedRow
                ? 'Select an object above'
                : focusedRow.statusGroup === 'Only in Source'
                ? 'Object does not exist'
                : focusedRow.statusGroup === 'Only in Target'
                ? 'Will be dropped if synchronized'
                : 'Object exists (modified) — see source DDL for sync script'}
            </pre>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Compared on {format(result.comparisonDate, 'PPpp')}
      </p>

      {/* Production deployment confirmation */}
      <AlertDialog open={showProdConfirm} onOpenChange={setShowProdConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Deploy to Production
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to deploy schema changes to <strong>{result.targetServer?.name}</strong> ({result.targetDatabase}).
                </p>
                <p>
                  A backup will be created automatically before deployment. This action modifies live production data.
                </p>
                <p className="text-sm">
                  Type <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{PROD_CONFIRM_PHRASE}</code> to confirm:
                </p>
                <Input
                  value={prodConfirmText}
                  onChange={(e) => setProdConfirmText(e.target.value)}
                  placeholder={PROD_CONFIRM_PHRASE}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (canConfirmProd) runDeploy();
              }}
              disabled={!canConfirmProd || isDeploying}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
