import { useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnvironmentBadge } from '@/components/shared';
import { EnvironmentSelector } from './EnvironmentSelector';
import { BackupScopeSelector } from './BackupScopeSelector';
import { BackupOptionsForm } from './BackupOptionsForm';
import { DestinationConfig } from './DestinationConfig';
import { BackupReview } from './BackupReview';
import { BackupExecution } from './BackupExecution';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Settings,
  FolderOpen,
  CheckCircle,
  Play,
} from 'lucide-react';
import { DatabaseSchema, EnvironmentType } from '@/types/backup.types';

const steps = [
  { id: 'environment', label: 'Environment', icon: Database, description: 'Select server & database' },
  { id: 'scope', label: 'Scope', icon: Layers, description: 'Choose objects to backup' },
  { id: 'options', label: 'Options', icon: Settings, description: 'Configure backup settings' },
  { id: 'destination', label: 'Destination', icon: FolderOpen, description: 'Set output location' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Confirm and execute' },
];

export interface BackupWizardState {
  serverId: string | null;
  environment: EnvironmentType | null;
  database: DatabaseSchema | null;
  selectedTables: string[];
  selectedProcedures: string[];
  selectedViews: string[];
  selectedFunctions: string[];
  selectedTriggers: string[];
  selectedEvents: string[];
  backupMode: 'structure' | 'data' | 'both';
  tableOptions: {
    includeForeignKeys: boolean;
    includeIndexes: boolean;
    includePrimaryKeys: boolean;
    includeConstraints: boolean;
    includeAutoIncrement: boolean;
    includeTableTriggers: boolean;
  };
  outputFormat: 'sql' | 'json' | 'xml' | 'csv' | 'zip';
  compression: { enabled: boolean; level: number };
  sqlOptions: {
    includeDropStatements: boolean;
    includeCreateStatements: boolean;
    includeUseDatabase: boolean;
    disableForeignKeyChecks: boolean;
    useTransactions: boolean;
    includeComments: boolean;
    includeTimestampHeader: boolean;
  };
  destinationPath: string;
  fileNamingPattern: string;
  retentionDays: number;
  autoDeleteOld: boolean;
}

const initialState: BackupWizardState = {
  serverId: null,
  environment: null,
  database: null,
  selectedTables: [],
  selectedProcedures: [],
  selectedViews: [],
  selectedFunctions: [],
  selectedTriggers: [],
  selectedEvents: [],
  backupMode: 'both',
  tableOptions: {
    includeForeignKeys: true,
    includeIndexes: true,
    includePrimaryKeys: true,
    includeConstraints: true,
    includeAutoIncrement: true,
    includeTableTriggers: false,
  },
  outputFormat: 'sql',
  compression: { enabled: true, level: 3 },
  sqlOptions: {
    includeDropStatements: true,
    includeCreateStatements: true,
    includeUseDatabase: true,
    disableForeignKeyChecks: true,
    useTransactions: true,
    includeComments: true,
    includeTimestampHeader: true,
  },
  destinationPath: '/var/backups/db-manager',
  fileNamingPattern: '{database}_{timestamp}.sql',
  retentionDays: 30,
  autoDeleteOld: true,
};

export function BackupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<BackupWizardState>(initialState);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateWizardState = (updates: Partial<BackupWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return wizardState.serverId && wizardState.database;
      case 1:
        return (
          wizardState.selectedTables.length > 0 ||
          wizardState.selectedProcedures.length > 0 ||
          wizardState.selectedViews.length > 0 ||
          wizardState.selectedFunctions.length > 0 ||
          wizardState.selectedTriggers.length > 0
        );
      case 2:
        return true;
      case 3:
        return wizardState.destinationPath && wizardState.fileNamingPattern;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStartBackup = () => {
    setIsExecuting(true);
  };

  if (isExecuting) {
    return (
      <BackupExecution
        wizardState={wizardState}
        onComplete={() => {
          setIsExecuting(false);
          setWizardState(initialState);
          setCurrentStep(0);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
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
                    isActive && 'bg-primary text-primary-foreground shadow-glow',
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
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-primary',
                      !isActive && 'text-muted-foreground'
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
                    'h-0.5 w-12 mx-2 hidden md:block',
                    isCompleted ? 'bg-green-500' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
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
            <EnvironmentSelector
              state={wizardState}
              onUpdate={updateWizardState}
            />
          )}
          {currentStep === 1 && (
            <BackupScopeSelector
              state={wizardState}
              onUpdate={updateWizardState}
            />
          )}
          {currentStep === 2 && (
            <BackupOptionsForm
              state={wizardState}
              onUpdate={updateWizardState}
            />
          )}
          {currentStep === 3 && (
            <DestinationConfig
              state={wizardState}
              onUpdate={updateWizardState}
            />
          )}
          {currentStep === 4 && (
            <BackupReview
              state={wizardState}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
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

        <div className="flex items-center gap-2">
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleStartBackup}
              disabled={!canProceed()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              Start Backup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
