import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

type StatusType = 'success' | 'failed' | 'partial' | 'pending' | 'running';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  className: string;
  icon: typeof CheckCircle;
}> = {
  success: {
    label: 'Success',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: CheckCircle,
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: XCircle,
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: AlertCircle,
  },
  pending: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
  running: {
    label: 'Running',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Clock,
  },
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border transition-colors inline-flex items-center gap-1',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], status === 'running' && 'animate-spin')} />}
      {config.label}
    </Badge>
  );
}
