import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type ConsoleLogEntry,
  subscribeToLogs,
  clearLogs as clearCapturedLogs,
} from '@/lib/consoleCapture';

export function DebugConsole({ onClose }: { onClose?: () => void }) {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    return subscribeToLogs(setLogs);
  }, []);

  const clearLogs = () => {
    clearCapturedLogs();
  };

  const getLogColor = (type: ConsoleLogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warn':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <Card className={`transition-all ${
      isCollapsed ? 'max-h-[60px]' : 'max-h-[600px]'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-mono">Debug Console</CardTitle>
            {logs.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({logs.length} {logs.length === 1 ? 'log' : 'logs'})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearLogs} disabled={logs.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-3 max-h-[500px] overflow-y-auto">
          <div className="space-y-2 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                No logs yet. Run a comparison to see debug output.
              </div>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-2 rounded border ${getLogColor(entry.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 whitespace-pre-wrap break-all">
                      {entry.message}
                    </div>
                    <span className="text-xs opacity-50 whitespace-nowrap">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
