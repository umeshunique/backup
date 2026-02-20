import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportSourceStep } from './ExportSourceStep';
import { ExportFormatStep } from './ExportFormatStep';
import { ExportOptionsStep } from './ExportOptionsStep';
import { ExportReviewStep } from './ExportReviewStep';
import {
  INITIAL_EXPORT_STATE,
  type ExportWizardState,
  type ExportFormat,
} from './exportWizardTypes';
import {
  formatAsCsv,
  formatAsJson,
  formatAsXml,
  formatAsSqlInsert,
  buildExcelBlob,
  downloadBlob,
  getExportFileName,
} from './exportFormatters';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Database,
  FileOutput,
  Settings2,
  ListOrdered,
  CheckCircle2,
  Loader2,
  Play,
} from 'lucide-react';

const steps = [
  { id: 'source', label: 'Source', icon: Database, description: 'Table or query' },
  { id: 'format', label: 'Format', icon: FileOutput, description: 'Output format' },
  { id: 'options', label: 'Options', icon: Settings2, description: 'Format options' },
  { id: 'review', label: 'Review', icon: ListOrdered, description: 'Confirm & export' },
];

export function ExportWizard() {
  const { servers, getServerById, setActiveTab } = useBackupStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<ExportWizardState>(INITIAL_EXPORT_STATE);
  const [isExporting, setIsExporting] = useState(false);

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Export Wizard</h2>
            <p className="text-sm text-muted-foreground">
              Export tables or query results to CSV, Excel, JSON, XML, or SQL INSERT with options.
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Database className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No servers configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add a database server to export data. Go to Servers to add your first connection.
            </p>
            <Button onClick={() => setActiveTab('servers')} variant="outline" className="gap-2">
              <Database className="h-4 w-4" />
              Add server
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateState = useCallback((updates: Partial<ExportWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!state.serverId || !state.databaseName) return false;
        if (state.sourceType === 'table') return !!state.tableName;
        return state.query.trim().length > 0;
      case 1:
      case 2:
      case 3:
        return true;
      default:
        return false;
    }
  };

  const runExport = useCallback(async () => {
    const server = state.serverId ? getServerById(state.serverId) : null;
    if (!server || !state.databaseName) {
      toast({ title: 'Error', description: 'Select server and database.', variant: 'destructive' });
      return;
    }
    const query =
      state.sourceType === 'table' && state.tableName
        ? `SELECT * FROM \`${state.tableName.replace(/`/g, '``')}\``
        : state.query.trim();
    if (!query) {
      toast({ title: 'Error', description: 'No query to run.', variant: 'destructive' });
      return;
    }
    setIsExporting(true);
    updateState({ exportStatus: 'running', exportResult: null });
    try {
      const res = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType,
        database: state.databaseName,
        query,
      });
      if (!res.success || !res.columns?.length || !res.rows) {
        updateState({
          exportStatus: 'failed',
          exportResult: {
            rowCount: 0,
            fileName: '',
            error: res.message || res.error || 'Query failed or returned no columns.',
          },
        });
        toast({
          title: 'Export failed',
          description: res.message || res.error || 'No data returned.',
          variant: 'destructive',
        });
        return;
      }
      const columns = res.columns;
      const rows = res.rows as unknown[][];
      const rowCount = rows.length;
      const format = state.format;
      const ext =
        format === 'csv'
          ? 'csv'
          : format === 'excel'
            ? 'xlsx'
            : format === 'json'
              ? 'json'
              : format === 'xml'
                ? 'xml'
                : 'sql';
      const fileName = getExportFileName(state, ext);

      if (format === 'csv') {
        const content = formatAsCsv(columns, rows, {
          delimiter: state.csvDelimiter,
          includeHeaders: state.includeHeaders,
        });
        const bom = state.encoding === 'utf-16' ? '\uFEFF' : '\uFEFF';
        const blob = new Blob([bom + content], {
          type: state.encoding === 'utf-16' ? 'text/plain;charset=utf-16' : 'text/csv;charset=utf-8',
        });
        downloadBlob(blob, fileName);
      } else if (format === 'excel') {
        const blob = buildExcelBlob(columns, rows, {
          includeHeaders: state.includeHeaders,
        });
        downloadBlob(blob, fileName);
      } else if (format === 'json') {
        const content = formatAsJson(columns, rows, { pretty: state.jsonPretty });
        const blob = new Blob([content], { type: 'application/json' });
        downloadBlob(blob, fileName);
      } else if (format === 'xml') {
        const content = formatAsXml(columns, rows, {
          rootName: state.xmlRootName || 'root',
          rowName: state.xmlRowName || 'row',
        });
        const blob = new Blob([content], { type: 'application/xml' });
        downloadBlob(blob, fileName);
      } else {
        const tableName =
          state.sqlInsertTableName ||
          (state.sourceType === 'table' && state.tableName ? state.tableName : 'export_table');
        const content = formatAsSqlInsert(columns, rows, {
          tableName,
          batchSize: state.sqlBatchSize,
        });
        const blob = new Blob([content], { type: 'text/plain' });
        downloadBlob(blob, fileName);
      }

      updateState({
        exportStatus: 'success',
        exportResult: { rowCount, fileName },
      });
      toast({
        title: 'Export complete',
        description: `${rowCount} rows exported to ${fileName}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      updateState({
        exportStatus: 'failed',
        exportResult: { rowCount: 0, fileName: '', error: message },
      });
      toast({ title: 'Export failed', description: message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [state, getServerById, updateState]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleExport = () => {
    runExport();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-all',
                  isActive && 'bg-primary/10',
                  isCompleted && 'cursor-pointer hover:bg-muted',
                  !isActive && !isCompleted && 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 mx-2 hidden md:block',
                    isCompleted ? 'bg-green-500' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = steps[currentStep].icon;
              return <Icon className="h-5 w-5 text-primary" />;
            })()}
            Step {currentStep + 1}: {steps[currentStep].label}
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <ExportSourceStep state={state} onUpdate={updateState} />
          )}
          {currentStep === 1 && (
            <ExportFormatStep state={state} onUpdate={updateState} />
          )}
          {currentStep === 2 && (
            <ExportOptionsStep state={state} onUpdate={updateState} />
          )}
          {currentStep === 3 && <ExportReviewStep state={state} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isExporting}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleExport}
              disabled={!canProceed() || isExporting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
          )}
        </div>
      </div>

      {state.exportStatus === 'success' && state.exportResult && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Export complete
              </p>
              <p className="text-sm text-muted-foreground">
                {state.exportResult.rowCount} rows saved to {state.exportResult.fileName}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {state.exportStatus === 'failed' && state.exportResult?.error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {state.exportResult.error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
