import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MigrationSourceTargetStep } from './MigrationSourceTargetStep';
import { MigrationScopeStep } from './MigrationScopeStep';
import { MigrationPreCheckStep } from './MigrationPreCheckStep';
import { MigrationReviewStep } from './MigrationReviewStep';
import { MigrationExecution } from './MigrationExecution';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  ShieldCheck,
  CheckCircle,
  Truck,
} from 'lucide-react';

export type MigrationScope = {
  schema: boolean;
  data: boolean;
  users: boolean;
};

export type MigrationWizardState = {
  sourceServerId: string | null;
  sourceDatabaseName: string | null;
  targetServerId: string | null;
  targetDatabaseName: string | null;
  scope: MigrationScope;
  runPreCheck: boolean;
  runPostVerification: boolean;
  createTargetIfMissing: boolean;
};

const steps = [
  { id: 'source-target', label: 'Source & Target', icon: Database, description: 'Select endpoints' },
  { id: 'scope', label: 'Scope', icon: Layers, description: 'Schema, data, users' },
  { id: 'precheck', label: 'Pre-check & Verify', icon: ShieldCheck, description: 'Validation options' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Confirm and run' },
];

const initialState: MigrationWizardState = {
  sourceServerId: null,
  sourceDatabaseName: null,
  targetServerId: null,
  targetDatabaseName: null,
  scope: { schema: true, data: true, users: false },
  runPreCheck: true,
  runPostVerification: true,
  createTargetIfMissing: false,
};

export function MigrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<MigrationWizardState>(initialState);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateState = (updates: Partial<MigrationWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const isSameEndpoint =
    state.sourceServerId &&
    state.targetServerId &&
    state.sourceDatabaseName &&
    state.targetDatabaseName &&
    state.sourceServerId === state.targetServerId &&
    state.sourceDatabaseName === state.targetDatabaseName;

  const hasScope = state.scope.schema || state.scope.data || state.scope.users;

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
        return hasScope;
      case 2:
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

  const handleStartMigration = () => {
    setIsExecuting(true);
  };

  const handleComplete = () => {
    setIsExecuting(false);
    setState(initialState);
    setCurrentStep(0);
  };

  if (isExecuting) {
    return (
      <MigrationExecution
        state={state}
        onComplete={handleComplete}
      />
    );
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
          {currentStep === 0 && <MigrationSourceTargetStep state={state} onUpdate={updateState} />}
          {currentStep === 1 && <MigrationScopeStep state={state} onUpdate={updateState} />}
          {currentStep === 2 && <MigrationPreCheckStep state={state} onUpdate={updateState} />}
          {currentStep === 3 && <MigrationReviewStep state={state} />}
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
            <Button
              onClick={handleStartMigration}
              disabled={!canProceed()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Truck className="h-4 w-4" />
              Start migration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
