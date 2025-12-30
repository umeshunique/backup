import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Filter, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ExecutionLog } from '@/types/backup.types';
import { format } from 'date-fns';

interface LogViewerProps {
  logs: ExecutionLog[];
  maxHeight?: number;
  autoScroll?: boolean;
  className?: string;
}

type LogLevel = 'all' | 'info' | 'warning' | 'error';

const levelConfig = {
  info: {
    icon: Info,
    className: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-400',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-400',
  },
};

export function LogViewer({
  logs,
  maxHeight = 400,
  autoScroll = true,
  className,
}: LogViewerProps) {
  const [filter, setFilter] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleExportLogs = () => {
    const logText = logs
      .map((log) => `[${format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-log-${format(new Date(), 'yyyyMMdd-HHmmss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const levelCounts = {
    info: logs.filter((l) => l.level === 'info').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error: logs.filter((l) => l.level === 'error').length,
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'info', 'warning', 'error'] as LogLevel[]).map((level) => (
              <Button
                key={level}
                variant={filter === level ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(level)}
                className="h-7 text-xs capitalize"
              >
                {level}
                {level !== 'all' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-1.5 h-4 text-[10px] px-1',
                      filter === level && levelConfig[level].badgeClass
                    )}
                  >
                    {levelCounts[level]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-48 pl-7 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleExportLogs} className="h-7">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Logs */}
      <ScrollArea className="font-mono text-xs" style={{ height: maxHeight }}>
        <div ref={scrollRef} className="p-2 space-y-0.5">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              No logs to display
            </div>
          ) : (
            filteredLogs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;

              return (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-start gap-2 px-2 py-1 rounded hover:bg-accent/50 transition-colors',
                    log.level === 'error' && 'bg-red-500/5'
                  )}
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {format(log.timestamp, 'HH:mm:ss.SSS')}
                  </span>
                  <Icon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', config.className)} />
                  <span className={cn('break-all', config.className)}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
