import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SyncSourceTargetStep } from './SyncSourceTargetStep';
import { SyncOptionsStep } from './SyncOptionsStep';
import { SyncReviewStep } from './SyncReviewStep';
import { SyncExecution } from './SyncExecution';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Settings,
  CheckCircle,
  Play,
  RefreshCw,
} from 'lucide-react';

export type SyncType = 'schema' | 'data' | 'both';
export type ConflictResolution = 'source_wins' | 'target_wins' | 'newest_wins' | 'manual';

export interface SyncWizardState {
  sourceServerId: string | null;
  sourceDatabaseName: string | null;
  targetServerId: string | null;
  targetDatabaseName: string | null;
  syncType: SyncType;
  conflictResolution: ConflictResolution;
  enableRollback: boolean;
}

const steps = [
  { id: 'source-target', label: 'Source & Target', icon: Database, description: 'Select both endpoints' },
  { id: 'options', label: 'Options', icon: Settings, description: 'Sync type, conflicts, rollback' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Confirm and run' },
];

const initialState: SyncWizardState = {
  sourceServerId: null,
  sourceDatabaseName: null,
  targetServerId: null,
  targetDatabaseName: null,
  syncType: 'both',
  conflictResolution: 'newest_wins',
  enableRollback: true,
};

export function SyncWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<SyncWizardState>(initialState);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateState = (updates: Partial<SyncWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const isSameEndpoint =
    state.sourceServerId &&
    state.targetServerId &&
    state.sourceDatabaseName &&
    state.targetDatabaseName &&
    state.sourceServerId === state.targetServerId &&
    state.sourceDatabaseName === state.targetDatabaseName;

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!(
          state.sourceServerId &&
          state.sourceDatabaseName &&
          state.targetServerId &&
          state.targetDatabaseName &&
          !isSameEndpoint
        );
      case 1:
        return true;
      case 2:
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

  const handleStartSync = () => {
    setIsExecuting(true);
  };

  const handleComplete = () => {
    setIsExecuting(false);
    setState(initialState);
    setCurrentStep(0);
  };

  if (isExecuting) {
    return (
      <SyncExecution
        state={state}
        onComplete={handleComplete}
      />
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
                    <CheckCircle className="h-5 w-5" />
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
          {currentStep === 0 && <SyncSourceTargetStep state={state} onUpdate={updateState} />}
          {currentStep === 1 && <SyncOptionsStep state={state} onUpdate={updateState} />}
          {currentStep === 2 && <SyncReviewStep state={state} />}
        </CardContent>
      </Card>

      {/* Navigation */}
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
            <Button
              onClick={handleStartSync}
              disabled={!canProceed()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="h-4 w-4" />
              Start sync
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
