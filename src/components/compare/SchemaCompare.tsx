import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, GitCompare, ArrowRight, AlertCircle, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComparisonSummary } from './ComparisonSummary';
import { ComparisonDetails } from './ComparisonDetails';
import { DebugConsole } from './DebugConsole';

export function SchemaCompare() {
  const {
    servers,
    databaseSchemas,
    loadDatabasesForServer,
    compareSchemas,
    comparisonResult,
    isComparing,
    clearComparisonResult,
  } = useBackupStore();

  const [sourceServerId, setSourceServerId] = useState<string>('');
  const [sourceDatabase, setSourceDatabase] = useState<string>('');
  const [targetServerId, setTargetServerId] = useState<string>('');
  const [targetDatabase, setTargetDatabase] = useState<string>('');
  const [showDebugConsole, setShowDebugConsole] = useState<boolean>(true);
  const [comparisonType, setComparisonType] = useState<string>('all');

  const sourceDatabases = databaseSchemas[sourceServerId] || [];
  const targetDatabases = databaseSchemas[targetServerId] || [];

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

  const handleCompare = async () => {
    if (!sourceServerId || !sourceDatabase || !targetServerId || !targetDatabase) {
      return;
    }
    await compareSchemas(sourceServerId, sourceDatabase, targetServerId, targetDatabase, comparisonType);
  };

  const handleReset = () => {
    clearComparisonResult();
    setSourceServerId('');
    setSourceDatabase('');
    setTargetServerId('');
    setTargetDatabase('');
  };

  const canCompare = sourceServerId && sourceDatabase && targetServerId && targetDatabase;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schema Comparison</h1>
        <p className="text-muted-foreground mt-2">
          Compare database schemas between source and target environments
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebugConsole(!showDebugConsole)}
          className="gap-2"
        >
          <Bug className="h-4 w-4" />
          {showDebugConsole ? 'Hide' : 'Show'} Debug Console
        </Button>
      </div>

      {!comparisonResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Schemas to Compare</CardTitle>
            <CardDescription>
              Choose source and target servers and databases to identify schema differences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <Label>Server</Label>
                  <Select value={sourceServerId} onValueChange={setSourceServerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source server" />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name} ({server.environment})
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
                    <p className="text-xs text-muted-foreground">Comparison schema</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select value={targetServerId} onValueChange={setTargetServerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target server" />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name} ({server.environment})
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
                      {targetDatabases.map((db) => (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Comparison Type Filter */}
            <div className="space-y-2 max-w-md">
              <Label>Comparison Type</Label>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select what to compare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Structure + Data + Objects)</SelectItem>
                  <SelectItem value="structure">Structure Only (Table Definitions)</SelectItem>
                  <SelectItem value="data">Data Only (Table Content)</SelectItem>
                  <SelectItem value="tables">Tables Only</SelectItem>
                  <SelectItem value="procedures">Stored Procedures Only</SelectItem>
                  <SelectItem value="views">Views Only</SelectItem>
                  <SelectItem value="functions">Functions Only</SelectItem>
                  <SelectItem value="triggers">Triggers Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which database components to include in the comparison
              </p>
            </div>

            {!canCompare && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select both source and target servers and databases to compare schemas.
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
              <Button onClick={handleCompare} disabled={!canCompare || isComparing} className="gap-2">
                {isComparing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4" />
                    Compare Schemas
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <ComparisonSummary result={comparisonResult} onReset={handleReset} />
          <ComparisonDetails result={comparisonResult} />
        </div>
      )}

      {showDebugConsole && <DebugConsole onClose={() => setShowDebugConsole(false)} />}
    </div>
  );
}
