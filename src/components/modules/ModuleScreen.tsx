import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPageMeta } from '@/components/layout/pageConfig';
import { getAppByTabId } from './modulesConfig';
import type { ScreenId } from '@/config/navigationConfig';
import { cn } from '@/lib/utils';

const accentBgClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

interface ModuleScreenProps {
  screenId: ScreenId;
}

/** Renders a consistent module screen: icon, title, description, and "In development" state. */
export function ModuleScreen({ screenId }: ModuleScreenProps) {
  const app = getAppByTabId(screenId);
  const meta = getPageMeta(screenId);
  const title = app?.title ?? meta.title;
  const description = app?.description ?? meta.description;
  const Icon = app?.icon;
  const accent = app?.accentColor ?? 'blue';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {Icon && (
              <div
                className={cn(
                  'rounded-xl p-4 shrink-0',
                  accentBgClasses[accent] ?? accentBgClasses.blue
                )}
              >
                <Icon className="h-10 w-10" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                <Badge variant="secondary" className="font-medium">
                  In development
                </Badge>
              </div>
              {description && (
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {description}
                </p>
              )}
              <p className="text-sm text-muted-foreground/80">
                This screen is implemented and reachable from the sidebar and Modules hub. Full feature UI will be added here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
