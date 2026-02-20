import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MigrationWizardState } from './MigrationWizard';
import { ShieldCheck, ClipboardCheck, Database } from 'lucide-react';

interface MigrationPreCheckStepProps {
  state: MigrationWizardState;
  onUpdate: (updates: Partial<MigrationWizardState>) => void;
}

export function MigrationPreCheckStep({ state, onUpdate }: MigrationPreCheckStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure pre-migration checks and post-migration verification. Pre-check validates compatibility and
        resources; post-verification confirms data integrity after migration.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pre-check
          </CardTitle>
          <CardDescription>
            Run compatibility and resource checks before migrating. Validates version, disk space, and connectivity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="migration-precheck" className="text-base font-medium">
                Run pre-check before migration
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Verify source and target compatibility, available space, and permissions. Migration will not start if
                checks fail.
              </p>
            </div>
            <Switch
              id="migration-precheck"
              checked={state.runPreCheck}
              onCheckedChange={(v) => onUpdate({ runPreCheck: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Post-verification
          </CardTitle>
          <CardDescription>
            After migration, run verification (e.g. row counts, checksums) to confirm data integrity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="migration-postverify" className="text-base font-medium">
                Run post-migration verification
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Compare row counts and optionally checksums between source and target. Report any mismatches.
              </p>
            </div>
            <Switch
              id="migration-postverify"
              checked={state.runPostVerification}
              onCheckedChange={(v) => onUpdate({ runPostVerification: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />
            Target database
          </CardTitle>
          <CardDescription>Create the target database if it does not exist (schema migration only).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="migration-create-target" className="text-base font-medium">
                Create target database if missing
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                If the target database does not exist, create it before applying schema. Disable if target must already
                exist.
              </p>
            </div>
            <Switch
              id="migration-create-target"
              checked={state.createTargetIfMissing}
              onCheckedChange={(v) => onUpdate({ createTargetIfMissing: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
