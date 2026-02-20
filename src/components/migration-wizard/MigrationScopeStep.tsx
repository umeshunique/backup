import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MigrationWizardState } from './MigrationWizard';
import { cn } from '@/lib/utils';
import { Layers, Table2, Users } from 'lucide-react';

interface MigrationScopeStepProps {
  state: MigrationWizardState;
  onUpdate: (updates: Partial<MigrationWizardState>) => void;
}

const scopeOptions: {
  key: keyof MigrationWizardState['scope'];
  label: string;
  description: string;
  icon: typeof Layers;
}[] = [
  {
    key: 'schema',
    label: 'Schema',
    description: 'Tables, views, indexes, constraints, stored procedures, and other DDL objects.',
    icon: Layers,
  },
  {
    key: 'data',
    label: 'Data',
    description: 'Row data for all tables (or selected tables if subset is supported later).',
    icon: Table2,
  },
  {
    key: 'users',
    label: 'Users & permissions',
    description: 'Logins, users, roles, and grants. Optional; enable when migrating security.',
    icon: Users,
  },
];

export function MigrationScopeStep({ state, onUpdate }: MigrationScopeStepProps) {
  const setScope = (key: keyof MigrationWizardState['scope'], value: boolean) => {
    onUpdate({ scope: { ...state.scope, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose what to migrate: schema (structure), data (rows), and optionally users and permissions. At least one
        scope must be selected.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" aria-hidden />
            Migration scope
          </CardTitle>
          <CardDescription>Select schema, data, and/or users to copy from source to target.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scopeOptions.map((opt) => {
            const Icon = opt.icon;
            const checked = state.scope[opt.key];
            return (
              <Label
                key={opt.key}
                className={cn(
                  'flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors',
                  checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setScope(opt.key, v === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </div>
              </Label>
            );
          })}
        </CardContent>
      </Card>

      {!state.scope.schema && !state.scope.data && !state.scope.users && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Select at least one scope (schema, data, or users) to continue.
        </div>
      )}
    </div>
  );
}
