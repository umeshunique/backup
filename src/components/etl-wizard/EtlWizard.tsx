import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EtlSourceTargetStep } from './EtlSourceTargetStep';
import { EtlOptionsStep } from './EtlOptionsStep';
import { EtlTransformStep } from './EtlTransformStep';
import { EtlReviewStep } from './EtlReviewStep';
import { EtlExecution } from './EtlExecution';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Database, Settings, CheckCircle, Play, ArrowLeftRight, Workflow } from 'lucide-react';

export type EtlMode = 'etl' | 'elt';

export interface EtlWizardState {
  sourceServerId: string | null;
  sourceDatabaseName: string | null;
  sourceTable: string | null;
  targetServerId: string | null;
  targetDatabaseName: string | null;
  targetTable: string | null;
  mode: EtlMode;
  /** ETL: target column -> source column. Empty = 1:1 copy. */
  columnMap: Record<string, string>;
  /** ETL: optional WHERE clause for extract. */
  filter: string;
  /** ELT: SQL run on target after load. */
  postLoadSql: string;
  batchSize: number;
  truncateFirst: boolean;
}

const steps = [
  { id: 'source-target', label: '1. Table selection', icon: Database, description: 'Pick source and target server, database, and table' },
  { id: 'options', label: 'Options', icon: Settings, description: 'Batch size and truncate' },
  { id: 'transform', label: '2. Column matching', icon: Workflow, description: 'Map columns between the tables you selected' },
  { id: 'review', label: 'Review & Run', icon: CheckCircle, description: 'Confirm and execute' },
];

const initialState: EtlWizardState = {
  sourceServerId: null,
  sourceDatabaseName: null,
  sourceTable: null,
  targetServerId: null,
  targetDatabaseName: null,
  targetTable: null,
  mode: 'etl',
  columnMap: {},
  filter: '',
  postLoadSql: '',
  batchSize: 1000,
  truncateFirst: false,
};

export function EtlWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<EtlWizardState>(initialState);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateState = (updates: Partial<EtlWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!(
          state.sourceServerId &&
          state.sourceDatabaseName &&
          state.sourceTable &&
          state.targetServerId &&
          state.targetDatabaseName &&
          state.targetTable &&
          !isSameTable
        );
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleStartEtl = () => {
    setIsExecuting(true);
  };

  const handleComplete = () => {
    setIsExecuting(false);
    setState(initialState);
    setCurrentStep(0);
  };

  if (isExecuting) {
    return <EtlExecution state={state} onComplete={handleComplete} />;
  }

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
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="hidden lg:block text-left">
                  <p className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={cn('h-0.5 w-8 mx-2 hidden md:block', isCompleted ? 'bg-green-500' : 'bg-border')} aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Step {currentStep + 1}: {steps[currentStep].label}
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && <EtlSourceTargetStep state={state} onUpdate={updateState} />}
          {currentStep === 1 && <EtlOptionsStep state={state} onUpdate={updateState} />}
          {currentStep === 2 && <EtlTransformStep state={state} onUpdate={updateState} />}
          {currentStep === 3 && <EtlReviewStep state={state} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0} className="gap-2">
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
            <Button onClick={handleStartEtl} disabled={!canProceed()} className="gap-2 bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4" />
              Run {state.mode === 'elt' ? 'ELT' : 'ETL'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
