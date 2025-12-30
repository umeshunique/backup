import { EnvironmentType } from '@/types/backup.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnvironmentBadgeProps {
  environment: EnvironmentType;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const environmentConfig: Record<EnvironmentType, { label: string; className: string }> = {
  development: {
    label: 'Development',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  },
  staging: {
    label: 'Staging',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  },
  uat: {
    label: 'UAT',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  },
  production: {
    label: 'Production',
    className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  },
  dr: {
    label: 'DR',
    className: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  },
};

export function EnvironmentBadge({ 
  environment, 
  size = 'md', 
  showDot = false,
  className 
}: EnvironmentBadgeProps) {
  const config = environmentConfig[environment];
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border transition-colors',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          environment === 'development' && 'bg-blue-400',
          environment === 'staging' && 'bg-amber-400',
          environment === 'uat' && 'bg-purple-400',
          environment === 'production' && 'bg-red-400',
          environment === 'dr' && 'bg-green-400'
        )} />
      )}
      {config.label}
    </Badge>
  );
}
