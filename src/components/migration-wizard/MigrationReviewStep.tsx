import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackupStore } from '@/store/backupStore';
import { EnvironmentBadge } from '@/components/shared';
import { MigrationWizardState } from './MigrationWizard';
import {
  Database,
  ArrowRight,
  Layers,
  ShieldCheck,
  ClipboardCheck,
  CheckCircle,
} from 'lucide-react';

interface MigrationReviewStepProps {
  state: MigrationWizardState;
}

export function MigrationReviewStep({ state }: MigrationReviewStepProps) {
  const { getServerById } = useBackupStore();
  const sourceServer = state.sourceServerId ? getServerById(state.sourceServerId) : null;
  const targetServer = state.targetServerId ? getServerById(state.targetServerId) : null;

  const scopeLabels: string[] = [];
  if (state.scope.schema) scopeLabels.push('Schema');
  if (state.scope.data) scopeLabels.push('Data');
  if (state.scope.users) scopeLabels.push('Users');

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your migration configuration. Click &quot;Start migration&quot; to run pre-check (if enabled), then
        migrate, then post-verification (if enabled).
      </p>

      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Endpoints
          </h3>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-blue-500/20 p-2.5 shrink-0">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{state.sourceDatabaseName ?? '—'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {sourceServer ? (
                    <>
                      {sourceServer.name}
                      <EnvironmentBadge environment={sourceServer.environment} size="sm" className="ml-1.5 inline-flex" />
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-emerald-500/20 p-2.5 shrink-0">
                <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{state.targetDatabaseName ?? '—'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {targetServer ? (
                    <>
                      {targetServer.name}
                      <EnvironmentBadge environment={targetServer.environment} size="sm" className="ml-1.5 inline-flex" />
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {scopeLabels.map((l) => (
                  <Badge key={l} variant="secondary" className="text-xs">
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pre-check</p>
              <p className="font-medium mt-0.5 flex items-center gap-2">
                {state.runPreCheck ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Enabled
                  </>
                ) : (
                  'Disabled'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Post-verify</p>
              <p className="font-medium mt-0.5 flex items-center gap-2">
                {state.runPostVerification ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Enabled
                  </>
                ) : (
                  'Disabled'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Create target</p>
              <p className="font-medium mt-0.5">{state.createTargetIfMissing ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border p-4 flex items-center gap-3 border-primary/30 bg-primary/5">
        <div className="rounded-full bg-primary/20 p-2">
          <CheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Ready to migrate</p>
          <p className="text-sm text-muted-foreground">
            Migration will copy {scopeLabels.join(', ').toLowerCase()} from {state.sourceDatabaseName} to{' '}
            {state.targetDatabaseName}. Pre-check and post-verification will run according to your options.
          </p>
        </div>
      </div>
    </div>
  );
}
