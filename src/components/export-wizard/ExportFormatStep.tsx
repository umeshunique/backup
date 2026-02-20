import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ExportWizardState, ExportFormat } from './exportWizardTypes';
import { FileText, FileSpreadsheet, Braces, FileCode, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const FORMATS: { id: ExportFormat; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'csv', label: 'CSV', description: 'Comma-separated values, widely compatible', icon: FileText },
  { id: 'excel', label: 'Excel', description: '.xlsx workbook', icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', description: 'Array of objects or pretty-printed', icon: Braces },
  { id: 'xml', label: 'XML', description: 'Structured markup with configurable elements', icon: FileCode },
  { id: 'sql', label: 'SQL INSERT', description: 'INSERT statements for replay', icon: Database },
];

interface ExportFormatStepProps {
  state: Pick<ExportWizardState, 'format'>;
  onUpdate: (updates: Partial<ExportWizardState>) => void;
}

export function ExportFormatStep({ state, onUpdate }: ExportFormatStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose the output format for your export. Options in the next step depend on this choice.
      </p>
      <RadioGroup
        value={state.format}
        onValueChange={(v) => onUpdate({ format: v as ExportFormat })}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FORMATS.map((f) => {
          const Icon = f.icon;
          const isActive = state.format === f.id;
          return (
            <label
              key={f.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors',
                'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value={f.id} id={`format-${f.id}`} className="mt-1" />
              <div className="flex gap-3">
                <div
                  className={cn(
                    'rounded-lg p-2',
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{f.label}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
