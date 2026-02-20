import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportFileStep } from './ImportFileStep';
import { ImportMappingStep } from './ImportMappingStep';
import { ImportValidationStep } from './ImportValidationStep';
import { ImportDuplicateStep } from './ImportDuplicateStep';
import { ImportReviewStep } from './ImportReviewStep';
import { ImportExecution } from './ImportExecution';
import {
  INITIAL_IMPORT_STATE,
  type ImportWizardState,
} from './importWizardTypes';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import type { TableColumn } from '@/types/backup.types';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Copy,
  ListOrdered,
  Play,
  CheckCircle2,
} from 'lucide-react';

const steps = [
  { id: 'file', label: 'File', icon: FileUp, description: 'Upload CSV or Excel' },
  { id: 'mapping', label: 'Mapping', icon: ArrowRightLeft, description: 'Map columns to table' },
  { id: 'validation', label: 'Validation', icon: AlertTriangle, description: 'Preview and validate' },
  { id: 'duplicates', label: 'Duplicates', icon: Copy, description: 'Handle duplicate keys' },
  { id: 'review', label: 'Review', icon: ListOrdered, description: 'Confirm and import' },
];

export function ImportWizard() {
  const { servers } = useBackupStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<ImportWizardState>(INITIAL_IMPORT_STATE);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);

  const updateState = (updates: Partial<ImportWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Load table columns when on validation step (or later) for validation UI
  useEffect(() => {
    if (currentStep < 2 || !state.serverId || !state.databaseName || !state.tableName) {
      setTableColumns([]);
      return;
    }
    const server = servers.find((s) => s.id === state.serverId);
    if (!server) return;
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
        if (res.success && res.schema?.tables) {
          const table = (res.schema as { tables: { name: string; columns?: TableColumn[] }[] }).tables.find(
            (t) => t.name === state.tableName
          );
          setTableColumns(table?.columns ?? []);
        } else {
          setTableColumns([]);
        }
      })
      .catch(() => setTableColumns([]));
  }, [currentStep, state.serverId, state.databaseName, state.tableName, servers]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!state.parsedFile && !state.fileError;
      case 1:
        return !!(
          state.serverId &&
          state.databaseName &&
          state.tableName &&
          state.parsedFile &&
          Object.values(state.columnMapping).some((v) => v !== '')
        );
      case 2:
        return state.validationErrors.length === 0;
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleValidationChange = useCallback((errors: ImportWizardState['validationErrors'], warnings: ImportWizardState['validationWarnings']) => {
    setState((prev) => ({ ...prev, validationErrors: errors, validationWarnings: warnings }));
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleStartImport = () => {
    setIsExecuting(true);
  };

  const handleComplete = () => {
    setIsExecuting(false);
    setState(INITIAL_IMPORT_STATE);
    setCurrentStep(0);
  };

  if (isExecuting) {
    return (
      <div className="space-y-6 animate-fade-in">
        <ImportExecution state={state} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Step indicator */}
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
                  <p className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn('h-0.5 w-8 mx-2 hidden md:block', isCompleted ? 'bg-green-500' : 'bg-border')}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
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
            <ImportFileStep
              state={state}
              onUpdate={updateState}
            />
          )}
          {currentStep === 1 && (
            <ImportMappingStep
              state={state}
              onUpdate={updateState}
            />
          )}
          {currentStep === 2 && (
            <ImportValidationStep
              state={state}
              tableColumns={tableColumns}
              onValidationChange={handleValidationChange}
            />
          )}
          {currentStep === 3 && (
            <ImportDuplicateStep state={state} onUpdate={updateState} />
          )}
          {currentStep === 4 && <ImportReviewStep state={state} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleStartImport}
              disabled={!canProceed()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              Start import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
