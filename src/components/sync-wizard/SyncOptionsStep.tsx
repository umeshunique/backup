import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { SyncWizardState } from './SyncWizard';
import { cn } from '@/lib/utils';
import { Layers, GitMerge, RotateCcw, Table2, Database, RefreshCw } from 'lucide-react';

interface SyncOptionsStepProps {
  state: SyncWizardState;
  onUpdate: (updates: Partial<SyncWizardState>) => void;
}

const syncTypeOptions: { value: SyncWizardState['syncType']; label: string; description: string; icon: typeof Layers }[] = [
  { value: 'schema', label: 'Schema only', description: 'Sync table structures, indexes, constraints. No row data.', icon: Layers },
  { value: 'data', label: 'Data only', description: 'Sync row data between matching tables. Schema must already match.', icon: Table2 },
  { value: 'both', label: 'Schema and data', description: 'Full bidirectional sync: structure first, then data.', icon: RefreshCw },
];

const conflictOptions: { value: SyncWizardState['conflictResolution']; label: string; description: string }[] = [
  { value: 'source_wins', label: 'Source wins', description: 'On conflict, keep source value.' },
  { value: 'target_wins', label: 'Target wins', description: 'On conflict, keep target value.' },
  { value: 'newest_wins', label: 'Newest wins', description: 'Compare timestamps; keep most recent.' },
  { value: 'manual', label: 'Manual resolution', description: 'Pause and let user choose per conflict.' },
];

export function SyncOptionsStep({ state, onUpdate }: SyncOptionsStepProps) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Configure what to sync and how to resolve conflicts. Enable rollback to create a snapshot before applying
        changes so you can revert if needed.
      </p>

      {/* Sync type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Sync type
          </CardTitle>
          <CardDescription>Choose whether to sync schema, data, or both.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.syncType}
            onValueChange={(v) => onUpdate({ syncType: v as SyncWizardState['syncType'] })}
            className="grid gap-4 sm:grid-cols-3"
          >
            {syncTypeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <Label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                    state.syncType === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
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
        </CardContent>
      </Card>

      {/* Conflict resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-primary" />
            Conflict resolution
          </CardTitle>
          <CardDescription>When the same row or object differs on both sides, how to decide the final value.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.conflictResolution}
            onValueChange={(v) => onUpdate({ conflictResolution: v as SyncWizardState['conflictResolution'] })}
            className="grid gap-3 sm:grid-cols-2"
          >
            {conflictOptions.map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  state.conflictResolution === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value={opt.value} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Rollback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-primary" />
            Rollback
          </CardTitle>
          <CardDescription>Create a snapshot before applying changes so you can roll back if needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="sync-rollback" className="text-base font-medium">Enable rollback snapshot</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Back up target state before sync; use it to revert if something goes wrong.
              </p>
            </div>
            <Switch
              id="sync-rollback"
              checked={state.enableRollback}
              onCheckedChange={(v) => onUpdate({ enableRollback: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
