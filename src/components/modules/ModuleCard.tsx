import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AppItem } from './modulesConfig';

const accentBorderClasses: Record<NonNullable<AppItem['accentColor']>, string> = {
  blue: 'border-blue-500/25 hover:border-blue-500/40 hover:bg-blue-500/5',
  purple: 'border-purple-500/25 hover:border-purple-500/40 hover:bg-purple-500/5',
  emerald: 'border-emerald-500/25 hover:border-emerald-500/40 hover:bg-emerald-500/5',
  amber: 'border-amber-500/25 hover:border-amber-500/40 hover:bg-amber-500/5',
  rose: 'border-rose-500/25 hover:border-rose-500/40 hover:bg-rose-500/5',
  cyan: 'border-cyan-500/25 hover:border-cyan-500/40 hover:bg-cyan-500/5',
  violet: 'border-violet-500/25 hover:border-violet-500/40 hover:bg-violet-500/5',
  orange: 'border-orange-500/25 hover:border-orange-500/40 hover:bg-orange-500/5',
  slate: 'border-slate-500/25 hover:border-slate-500/40 hover:bg-slate-500/5',
};

const iconClasses: Record<NonNullable<AppItem['accentColor']>, string> = {
  blue: 'text-blue-500 bg-blue-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  amber: 'text-amber-500 bg-amber-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  cyan: 'text-cyan-500 bg-cyan-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
  slate: 'text-slate-500 bg-slate-500/10',
};

interface ModuleCardProps {
  app: AppItem;
  className?: string;
}

export function ModuleCard({ app, className }: ModuleCardProps) {
  const { setActiveTab } = useBackupStore();
  const Icon = app.icon;
  const isDeveloped = !!app.tabId;

  const handleClick = () => {
    if (app.tabId) {
      setActiveTab(app.tabId);
    } else {
      toast.info('Coming Soon', {
        description: `${app.title} is under development. Stay tuned!`,
      });
    }
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer border-2 transition-all duration-200',
        isDeveloped
          ? 'border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 hover:border-primary/30'
          : accentBorderClasses[app.accentColor],
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={cn(
            'rounded-lg p-2 shrink-0',
            isDeveloped ? 'bg-primary/15 text-primary' : iconClasses[app.accentColor]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm tracking-tight truncate">{app.title}</h4>
            {isDeveloped ? (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-medium px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                Open
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-medium px-1.5 py-0 text-muted-foreground">
                Coming Soon
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{app.description}</p>
          {isDeveloped && (
            <Button
              variant="default"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(app.tabId!);
              }}
            >
              Open
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
