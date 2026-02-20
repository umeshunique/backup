import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileOutput,
  Loader2,
  ArrowRight,
  Database,
  Copy,
  Download,
  RotateCcw,
  Shield,
  GitCompare,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { EnvironmentBadge } from '@/components/shared';
import { ComparisonSummary } from '@/components/compare/ComparisonSummary';
import { generateRollbackScript, makeScriptIdempotent } from './changeScriptUtils';
import { toast } from '@/hooks/use-toast';

type Step = 'select' | 'diff' | 'scripts';

export function ChangeScriptGenerator() {
  const {
    servers,
    databaseSchemas,
    loadDatabasesForServer,
    compareSchemas,
    comparisonResult,
    isComparing,
    clearComparisonResult,
    getDatabasesForServer,
  } = useBackupStore();

  const [step, setStep] = useState<Step>('select');
  const [sourceServerId, setSourceServerId] = useState<string>('');
  const [sourceDatabase, setSourceDatabase] = useState<string>('');
  const [targetServerId, setTargetServerId] = useState<string>('');
  const [targetDatabase, setTargetDatabase] = useState<string>('');
  const [comparisonType, setComparisonType] = useState<string>('structure');
  const [includeRollback, setIncludeRollback] = useState(true);
  const [idempotent, setIdempotent] = useState(true);

  const sourceDatabases = databaseSchemas[sourceServerId] || [];
  const targetDatabases = databaseSchemas[targetServerId] || [];

  useEffect(() => {
    if (sourceServerId) loadDatabasesForServer(sourceServerId);
  }, [sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (targetServerId) loadDatabasesForServer(targetServerId);
  }, [targetServerId, loadDatabasesForServer]);

  const canCompare =
    sourceServerId && sourceDatabase && targetServerId && targetDatabase &&
    !(sourceServerId === targetServerId && sourceDatabase === targetDatabase);

  const handleCompare = async () => {
    if (!canCompare) return;
    await compareSchemas(sourceServerId, sourceDatabase, targetServerId, targetDatabase, comparisonType);
    setStep('diff');
  };

  const handleReset = () => {
    clearComparisonResult();
    setSourceServerId('');
    setSourceDatabase('');
    setTargetServerId('');
    setTargetDatabase('');
    setStep('select');
  };

  const handleGenerateScripts = () => {
    setStep('scripts');
  };

  const migrationScript = comparisonResult
    ? idempotent
      ? makeScriptIdempotent(comparisonResult.deploymentScript)
      : comparisonResult.deploymentScript
    : '';

  const rollbackScript = comparisonResult && includeRollback
    ? generateRollbackScript(comparisonResult)
    : '';

  const handleCopyMigration = async () => {
    try {
      await navigator.clipboard.writeText(migrationScript);
      toast({ title: 'Copied', description: 'Migration script copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyRollback = async () => {
    try {
      await navigator.clipboard.writeText(rollbackScript);
      toast({ title: 'Copied', description: 'Rollback script copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownloadMigration = () => {
    const blob = new Blob([migrationScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_${sourceDatabase}_to_${targetDatabase}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRollback = () => {
    const blob = new Blob([rollbackScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rollback_${sourceDatabase}_to_${targetDatabase}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBoth = () => {
    const combined = `-- Migration script\n${migrationScript}\n\n-- ========================================\n-- ROLLBACK (separate file)\n-- ========================================\n${rollbackScript}`;
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_with_rollback_${sourceDatabase}_to_${targetDatabase}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3">
          <FileOutput className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Change Script Generator</h1>
          <p className="text-muted-foreground">
            Generate migration scripts from schema diff with rollback and idempotent options
          </p>
        </div>
      </div>

      {/* Step: Select source & target */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Select Schemas to Compare
            </CardTitle>
            <CardDescription>
              Choose source and target servers and databases. The diff will drive the migration script.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] items-start">
              <div className="space-y-4 rounded-lg border-2 border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 font-semibold">S</span>
                  <h3 className="font-semibold">Source</h3>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select value={sourceServerId} onValueChange={(v) => { setSourceServerId(v); setSourceDatabase(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source server" />
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
                    value={sourceDatabase}
                    onValueChange={setSourceDatabase}
                    disabled={!sourceServerId || sourceDatabases.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source database" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceDatabases.length === 0 && sourceServerId ? (
                        <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : (
                        sourceDatabases.map((db) => (
                          <SelectItem key={db.name} value={db.name}>
                            {db.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center pt-8">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="space-y-4 rounded-lg border-2 border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-violet-500 font-semibold">T</span>
                  <h3 className="font-semibold">Target</h3>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select value={targetServerId} onValueChange={(v) => { setTargetServerId(v); setTargetDatabase(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target server" />
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
                    value={targetDatabase}
                    onValueChange={setTargetDatabase}
                    disabled={!targetServerId || targetDatabases.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target database" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetDatabases.length === 0 && targetServerId ? (
                        <div className="p-2 flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : (
                        targetDatabases.map((db) => (
                          <SelectItem key={db.name} value={db.name}>
                            {db.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <Label>Comparison Scope</Label>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structure">Structure only (tables, columns)</SelectItem>
                  <SelectItem value="all">All (structure + procedures, views, etc.)</SelectItem>
                  <SelectItem value="tables">Tables only</SelectItem>
                  <SelectItem value="procedures">Procedures only</SelectItem>
                  <SelectItem value="views">Views only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleCompare} disabled={!canCompare || isComparing} className="gap-2">
                {isComparing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparing…
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4" />
                    Compare & Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Diff summary & options */}
      {step === 'diff' && comparisonResult && (
        <div className="space-y-6">
          <ComparisonSummary result={comparisonResult} onReset={handleReset} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Script Options
              </CardTitle>
              <CardDescription>
                Configure how the migration and rollback scripts are generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Include rollback script</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate a separate script to revert changes
                  </p>
                </div>
                <Switch checked={includeRollback} onCheckedChange={setIncludeRollback} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Idempotent script</Label>
                  <p className="text-sm text-muted-foreground">
                    Use IF NOT EXISTS / safe patterns so the script can be run multiple times
                  </p>
                </div>
                <Switch checked={idempotent} onCheckedChange={setIdempotent} />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('select')} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  New comparison
                </Button>
                <Button onClick={handleGenerateScripts} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <FileOutput className="h-4 w-4" />
                  Generate Scripts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Generated scripts */}
      {step === 'scripts' && comparisonResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Generated Scripts
                  </CardTitle>
                  <CardDescription>
                    Migration and optional rollback scripts ready to copy or download
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyMigration} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy migration
                  </Button>
                  {includeRollback && (
                    <Button variant="outline" size="sm" onClick={handleCopyRollback} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy rollback
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleDownloadMigration} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download migration
                  </Button>
                  {includeRollback && (
                    <Button variant="outline" size="sm" onClick={handleDownloadRollback} className="gap-2">
                      <Download className="h-4 w-4" />
                      Download rollback
                    </Button>
                  )}
                  {includeRollback && (
                    <Button size="sm" onClick={handleDownloadBoth} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Download className="h-4 w-4" />
                      Both as one file
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="migration">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="migration" className="gap-2">
                    <FileOutput className="h-4 w-4" />
                    Migration
                  </TabsTrigger>
                  <TabsTrigger value="rollback" disabled={!includeRollback} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Rollback
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="migration" className="mt-4">
                  <div className="rounded-lg border bg-muted/30">
                    <ScrollArea className="h-[400px] w-full">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                        {migrationScript || 'No migration script generated'}
                      </pre>
                    </ScrollArea>
                  </div>
                </TabsContent>
                <TabsContent value="rollback" className="mt-4">
                  <div className="rounded-lg border bg-muted/30">
                    <ScrollArea className="h-[400px] w-full">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                        {rollbackScript || 'No rollback script generated'}
                      </pre>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('diff')} className="gap-2">
              Back to options
            </Button>
            <Button onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              New comparison
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
