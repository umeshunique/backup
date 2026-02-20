import { useState, useEffect, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, GitCompare, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2, Database, Code2, Eye, Zap, FileCode, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnvironmentBadge } from '@/components/shared';
import { ComparisonBuildResult } from './ComparisonBuildResult';
import { EnvironmentType } from '@/types/backup.types';
import { toast } from '@/hooks/use-toast';

const ENV_ORDER: EnvironmentType[] = ['development', 'staging', 'uat', 'production', 'dr'];
const PRESETS: { label: string; sourceEnv: EnvironmentType; targetEnv: EnvironmentType }[] = [
  { label: 'Staging → Production', sourceEnv: 'staging', targetEnv: 'production' },
  { label: 'Dev → Staging', sourceEnv: 'development', targetEnv: 'staging' },
  { label: 'UAT → Production', sourceEnv: 'uat', targetEnv: 'production' },
  { label: 'Dev → UAT', sourceEnv: 'development', targetEnv: 'uat' },
];

export type ComparisonMode = 'structure' | 'data' | 'both';

export interface ComparisonTypeConfig {
  tables: boolean;
  procedures: boolean;
  views: boolean;
  functions: boolean;
  triggers: boolean;
  events: boolean;
  comparisonMode: ComparisonMode;
}

const DEFAULT_OBJECT_TYPES: ComparisonTypeConfig = {
  tables: true,
  procedures: true,
  views: true,
  functions: true,
  triggers: true,
  events: true,
  comparisonMode: 'structure',
};

const OBJECT_TYPE_OPTIONS: { key: keyof Omit<ComparisonTypeConfig, 'comparisonMode'>; label: string; icon: typeof Database }[] = [
  { key: 'tables', label: 'Tables', icon: Database },
  { key: 'procedures', label: 'Stored Procedures', icon: Code2 },
  { key: 'views', label: 'Views', icon: Eye },
  { key: 'functions', label: 'Functions', icon: FileCode },
  { key: 'triggers', label: 'Triggers', icon: Zap },
  { key: 'events', label: 'Events', icon: Calendar },
];

export function SchemaCompare() {
  const {
    servers,
    databaseSchemas,
    loadServers,
    loadDatabasesForServer,
    compareSchemas,
    comparisonResult,
    isComparing,
    clearComparisonResult,
    testConnection,
    getServerById,
  } = useBackupStore();

  const [sourceServerId, setSourceServerId] = useState<string>('');
  const [sourceDatabase, setSourceDatabase] = useState<string>('');
  const [targetServerId, setTargetServerId] = useState<string>('');
  const [targetDatabase, setTargetDatabase] = useState<string>('');
  const [objectTypes, setObjectTypes] = useState<ComparisonTypeConfig>(DEFAULT_OBJECT_TYPES);
  const [sourceEnvFilter, setSourceEnvFilter] = useState<EnvironmentType | 'all'>('all');
  const [targetEnvFilter, setTargetEnvFilter] = useState<EnvironmentType | 'all'>('all');
  const [objectFilterPattern, setObjectFilterPattern] = useState<string>('');
  const [validateConnections, setValidateConnections] = useState(true);
  const [validatingConnections, setValidatingConnections] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const sourceDatabases = databaseSchemas[sourceServerId] || [];
  const targetDatabases = databaseSchemas[targetServerId] || [];

  const filteredSourceServers = useMemo(() => {
    if (sourceEnvFilter === 'all') return servers;
    return servers.filter((s) => s.environment === sourceEnvFilter);
  }, [servers, sourceEnvFilter]);

  const filteredTargetServers = useMemo(() => {
    if (targetEnvFilter === 'all') return servers;
    return servers.filter((s) => s.environment === targetEnvFilter);
  }, [servers, targetEnvFilter]);

  const sourceServer = sourceServerId ? getServerById(sourceServerId) : undefined;
  const targetServer = targetServerId ? getServerById(targetServerId) : undefined;
  const isTargetProduction = targetServer?.environment === 'production';

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (sourceServerId) {
      loadDatabasesForServer(sourceServerId);
    }
  }, [sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (targetServerId) {
      loadDatabasesForServer(targetServerId);
    }
  }, [targetServerId, loadDatabasesForServer]);

  const applyPreset = (sourceEnv: EnvironmentType, targetEnv: EnvironmentType) => {
    setSourceEnvFilter(sourceEnv);
    setTargetEnvFilter(targetEnv);
    const src = servers.find((s) => s.environment === sourceEnv);
    const tgt = servers.find((s) => s.environment === targetEnv);
    if (src) setSourceServerId(src.id);
    if (tgt) setTargetServerId(tgt.id);
    setSourceDatabase('');
    setTargetDatabase('');
  };

  const handleCompare = async () => {
    if (!sourceServerId || !sourceDatabase || !targetServerId || !targetDatabase) return;
    setCompareError(null);
    if (validateConnections) {
      setValidatingConnections(true);
      try {
        const [srcOk, tgtOk] = await Promise.all([
          testConnection(sourceServerId),
          testConnection(targetServerId),
        ]);
        if (!srcOk || !tgtOk) {
          setCompareError('Connection validation failed. Ensure both servers are reachable.');
          toast({ title: 'Connection failed', description: 'One or both servers could not be reached.', variant: 'destructive' });
          setValidatingConnections(false);
          return;
        }
      } catch {
        setCompareError('Connection validation failed.');
        setValidatingConnections(false);
        return;
      }
      setValidatingConnections(false);
    }
    try {
      const comparisonConfig = JSON.stringify(objectTypes);
      await compareSchemas(sourceServerId, sourceDatabase, targetServerId, targetDatabase, comparisonConfig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Schema comparison failed';
      setCompareError(msg);
      toast({ title: 'Compare failed', description: msg, variant: 'destructive' });
    }
  };

  const handleReset = () => {
    clearComparisonResult();
    setSourceServerId('');
    setSourceDatabase('');
    setTargetServerId('');
    setTargetDatabase('');
    setCompareError(null);
  };

  const isSameEndpoint =
    sourceServerId &&
    targetServerId &&
    sourceDatabase &&
    targetDatabase &&
    sourceServerId === targetServerId &&
    sourceDatabase === targetDatabase;

  const hasObjectTypeSelected =
    objectTypes.tables ||
    objectTypes.procedures ||
    objectTypes.views ||
    objectTypes.functions ||
    objectTypes.triggers ||
    objectTypes.events;

  const canCompare =
    sourceServerId &&
    sourceDatabase &&
    targetServerId &&
    targetDatabase &&
    !isSameEndpoint &&
    hasObjectTypeSelected;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schema Comparison</h1>
        <p className="text-muted-foreground mt-2">
          Compare database schemas between source and target environments
        </p>
      </div>

      {!comparisonResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Schemas to Compare</CardTitle>
            <CardDescription>
              Choose source and target servers by environment. Validate connections before compare. Safe for live production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick presets by environment */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center">Quick presets:</span>
              {PRESETS.map((p) => {
                const hasSrc = servers.some((s) => s.environment === p.sourceEnv);
                const hasTgt = servers.some((s) => s.environment === p.targetEnv);
                return (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(p.sourceEnv, p.targetEnv)}
                    disabled={!hasSrc || !hasTgt}
                    className="text-xs"
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              {/* Source Selection - LEFT */}
              <div className="space-y-4 border-r pr-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-500 font-semibold">S</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Source</h3>
                    <p className="text-xs text-muted-foreground">Reference schema</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Environment filter</Label>
                  <Select
                    value={sourceEnvFilter}
                    onValueChange={(v) => {
                      setSourceEnvFilter(v as EnvironmentType | 'all');
                      setSourceServerId('');
                      setSourceDatabase('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All environments</SelectItem>
                      {ENV_ORDER.map((env) => (
                        <SelectItem key={env} value={env}>
                          {env.charAt(0).toUpperCase() + env.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select
                    value={sourceServerId}
                    onValueChange={(v) => {
                      setSourceServerId(v);
                      setSourceDatabase('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source server" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSourceServers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          <span className="flex items-center gap-2">
                            {server.name}
                            <EnvironmentBadge environment={server.environment} size="sm" />
                          </span>
                        </SelectItem>
                      ))}
                      {filteredSourceServers.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No servers in selected environment
                        </div>
                      )}
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
                      {sourceDatabases.map((db) => (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Arrow - CENTER */}
              <div className="flex items-center justify-center pt-16">
                <ArrowRight className="h-8 w-8 text-primary" />
              </div>

              {/* Target Selection - RIGHT */}
              <div className="space-y-4 border-l pl-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-500 font-semibold">T</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Target</h3>
                    <p className="text-xs text-muted-foreground">Deploy target</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Environment filter</Label>
                  <Select
                    value={targetEnvFilter}
                    onValueChange={(v) => {
                      setTargetEnvFilter(v as EnvironmentType | 'all');
                      setTargetServerId('');
                      setTargetDatabase('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All environments</SelectItem>
                      {ENV_ORDER.map((env) => (
                        <SelectItem key={env} value={env}>
                          {env.charAt(0).toUpperCase() + env.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select
                    value={targetServerId}
                    onValueChange={(v) => {
                      setTargetServerId(v);
                      setTargetDatabase('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target server" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTargetServers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          <span className="flex items-center gap-2">
                            {server.name}
                            <EnvironmentBadge environment={server.environment} size="sm" />
                          </span>
                        </SelectItem>
                      ))}
                      {filteredTargetServers.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No servers in selected environment
                        </div>
                      )}
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
                      {targetDatabases.map((db) => (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isTargetProduction && (
                  <Alert className="border-amber-500/50 bg-amber-500/5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      Target is <strong>Production</strong>. Deployment will require confirmation. Backup is created automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Comparison Type: Object types + Mode (Structure / Data / Both) */}
            <div className="space-y-4">
              <Label>Comparison Type</Label>
              <div className="flex flex-col gap-4 p-4 rounded-lg border bg-muted/20">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xs font-medium text-muted-foreground">Object types:</span>
                  {OBJECT_TYPE_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={objectTypes[key]}
                        onCheckedChange={(checked) =>
                          setObjectTypes((prev) => ({ ...prev, [key]: checked === true }))
                        }
                      />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-start gap-4 pt-2 border-t">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Mode:</span>
                  <div className="flex flex-wrap gap-4">
                    {(['structure', 'data', 'both'] as ComparisonMode[]).map((mode) => (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="comparisonMode"
                          checked={objectTypes.comparisonMode === mode}
                          onChange={() => setObjectTypes((prev) => ({ ...prev, comparisonMode: mode }))}
                          className="rounded-full"
                        />
                        <span>
                          {mode === 'structure' && 'Structure only (DDL)'}
                          {mode === 'data' && 'Data only (tables, views)'}
                          {mode === 'both' && 'Both (structure + data)'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Object types: tables, procedures, views, functions, triggers, events. Structure = definitions; Data = row content for tables/views.
              </p>
            </div>

            {/* Advanced options */}
            <div className="flex flex-wrap items-center gap-6 p-3 rounded-lg bg-muted/30">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={validateConnections}
                  onChange={(e) => setValidateConnections(e.target.checked)}
                  className="rounded"
                />
                Validate connections before compare
              </label>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground shrink-0">Object filter (optional)</Label>
                <Input
                  placeholder="e.g. user_%, config"
                  value={objectFilterPattern}
                  onChange={(e) => setObjectFilterPattern(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {isSameEndpoint && (
              <Alert className="border-amber-500/50 bg-amber-500/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Source and target are the same. Choose different server or database to compare.
                </AlertDescription>
              </Alert>
            )}

            {compareError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{compareError}</AlertDescription>
              </Alert>
            )}

            {!canCompare && !compareError && !isSameEndpoint && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!hasObjectTypeSelected
                    ? 'Select at least one object type (Tables, Procedures, Views, etc.) to compare.'
                    : 'Please select both source and target servers and databases to compare schemas.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!sourceServerId && !targetServerId}
              >
                Reset
              </Button>
              <Button
                onClick={handleCompare}
                disabled={!canCompare || isComparing || validatingConnections}
                className="gap-2"
              >
                {(isComparing || validatingConnections) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {validatingConnections ? 'Validating...' : 'Comparing...'}
                  </>
                ) : (
                  <>
                    {validateConnections ? <CheckCircle2 className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
                    Compare Schemas
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col min-h-[480px]">
          <ComparisonBuildResult result={comparisonResult} onReset={handleReset} />
        </div>
      )}
    </div>
  );
}
