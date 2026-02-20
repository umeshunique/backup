import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComingSoonAppCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'orange' | 'slate';
  className?: string;
}

const accentClasses: Record<NonNullable<ComingSoonAppCardProps['accentColor']>, string> = {
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

const iconClasses: Record<NonNullable<ComingSoonAppCardProps['accentColor']>, string> = {
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

export function ComingSoonAppCard({
  icon: Icon,
  title,
  description,
  accentColor = 'slate',
  className,
}: ComingSoonAppCardProps) {
  return (
    <Card
      className={cn(
        'group cursor-default border-2 transition-all duration-200',
        accentClasses[accentColor],
        className
      )}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('rounded-lg p-2 shrink-0', iconClasses[accentColor])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm tracking-tight truncate">{title}</h4>
            <Badge variant="secondary" className="shrink-0 text-[10px] font-medium text-muted-foreground px-1.5 py-0">
              Coming Soon
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
