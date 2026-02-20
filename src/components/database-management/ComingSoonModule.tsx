import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComingSoonModuleProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  accentColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'orange';
  className?: string;
}

const accentClasses: Record<NonNullable<ComingSoonModuleProps['accentColor']>, string> = {
  blue: 'from-blue-500/15 to-blue-600/5 border-blue-500/20',
  purple: 'from-purple-500/15 to-purple-600/5 border-purple-500/20',
  emerald: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20',
  amber: 'from-amber-500/15 to-amber-600/5 border-amber-500/20',
  rose: 'from-rose-500/15 to-rose-600/5 border-rose-500/20',
  cyan: 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20',
  violet: 'from-violet-500/15 to-violet-600/5 border-violet-500/20',
  orange: 'from-orange-500/15 to-orange-600/5 border-orange-500/20',
};

const iconClasses: Record<NonNullable<ComingSoonModuleProps['accentColor']>, string> = {
  blue: 'text-blue-500 bg-blue-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  amber: 'text-amber-500 bg-amber-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  cyan: 'text-cyan-500 bg-cyan-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
};

export function ComingSoonModule({
  icon: Icon,
  title,
  description,
  features,
  accentColor = 'blue',
  className,
}: ComingSoonModuleProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden bg-gradient-to-br border-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5',
        accentClasses[accentColor],
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('rounded-xl p-3', iconClasses[accentColor])}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs font-medium text-muted-foreground">
            Coming Soon
          </Badge>
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
