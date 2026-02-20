import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ImportWizardState, DuplicateMode } from './importWizardTypes';
import { SkipForward, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportDuplicateStepProps {
  state: Pick<ImportWizardState, 'duplicateMode'>;
  onUpdate: (updates: Partial<ImportWizardState>) => void;
}

const options: { value: DuplicateMode; label: string; description: string; icon: typeof SkipForward }[] = [
  {
    value: 'skip',
    label: 'Skip duplicate rows',
    description: 'If a row would violate a unique/primary key, skip it and continue. Safe for appends.',
    icon: SkipForward,
  },
  {
    value: 'update',
    label: 'Update existing rows',
    description: 'On duplicate key, update the existing row with the new values. Requires unique/primary key mapping.',
    icon: RefreshCw,
  },
  {
    value: 'replace',
    label: 'Replace table data',
    description: 'Truncate the table first, then insert all rows. All existing data in the table will be removed.',
    icon: Trash2,
  },
  {
    value: 'fail',
    label: 'Fail on duplicate',
    description: 'Stop the import and report an error as soon as a duplicate key is encountered.',
    icon: AlertCircle,
  },
];

export function ImportDuplicateStep({ state, onUpdate }: ImportDuplicateStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose how to handle rows that conflict with existing data (e.g. duplicate primary or unique keys).
      </p>

      <RadioGroup
        value={state.duplicateMode}
        onValueChange={(v) => onUpdate({ duplicateMode: v as DuplicateMode })}
        className="grid gap-3 sm:grid-cols-2"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = state.duplicateMode === opt.value;
          return (
            <Label
              key={opt.value}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                isActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
