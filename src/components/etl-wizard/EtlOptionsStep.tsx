import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { EtlWizardState } from './EtlWizard';

interface EtlOptionsStepProps {
  state: EtlWizardState;
  onUpdate: (updates: Partial<EtlWizardState>) => void;
}

export function EtlOptionsStep({ state, onUpdate }: EtlOptionsStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Set how many rows to move per batch and whether to replace or add to the target table.
      </p>
      <Card>
        <CardContent className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="batch-size">Batch size</Label>
              <p className="text-xs text-muted-foreground">Number of rows to read and write in each chunk (1–10000). Larger = faster but uses more memory.</p>
            </div>
            <Input
              id="batch-size"
              type="number"
              min={1}
              max={10000}
              value={state.batchSize}
              onChange={(e) => onUpdate({ batchSize: Math.min(10000, Math.max(1, Number(e.target.value) || 1000)) })}
              className="w-28"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="truncate">Clear target table before loading</Label>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>On:</strong> Delete all existing rows in the target table first, then load. You get a full replace (target = copy of source).<br />
                <strong>Off:</strong> Keep existing rows and add new ones (append). Use when you want to add data without removing what’s already there.
              </p>
            </div>
            <Switch
              id="truncate"
              checked={state.truncateFirst}
              onCheckedChange={(v) => onUpdate({ truncateFirst: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
