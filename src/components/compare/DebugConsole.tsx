import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ConsoleLog {
  id: string;
  timestamp: Date;
  type: 'log' | 'error' | 'warn';
  message: string;
  data?: any;
}

// Store logs globally so they persist even if component unmounts/remounts
let globalLogs: ConsoleLog[] = [];
let logListeners: Array<(logs: ConsoleLog[]) => void> = [];

// Intercept console methods immediately when this module loads
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const addLog = (log: ConsoleLog) => {
  globalLogs = [...globalLogs, log];
  logListeners.forEach(listener => listener(globalLogs));
};

console.log = (...args: any[]) => {
  originalLog(...args);
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  addLog({
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'log',
    message,
    data: args.length > 1 ? args : args[0]
  });
};

console.error = (...args: any[]) => {
  originalError(...args);
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  addLog({
    id: `error-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'error',
    message,
    data: args.length > 1 ? args : args[0]
  });
};

console.warn = (...args: any[]) => {
  originalWarn(...args);
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  addLog({
    id: `warn-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'warn',
    message,
    data: args.length > 1 ? args : args[0]
  });
};

export function DebugConsole({ onClose }: { onClose?: () => void }) {
  const [logs, setLogs] = useState<ConsoleLog[]>(globalLogs);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to log updates
    const listener = (newLogs: ConsoleLog[]) => {
      setLogs([...newLogs]);
    };
    logListeners.push(listener);

    return () => {
      logListeners = logListeners.filter(l => l !== listener);
    };
  }, []);

  const clearLogs = () => {
    globalLogs = [];
    setLogs([]);
    logListeners.forEach(listener => listener([]));
  };

  const getLogColor = (type: ConsoleLog['type']) => {
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
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border ${getLogColor(log.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 whitespace-pre-wrap break-all">
                      {log.message}
                    </div>
                    <span className="text-xs opacity-50 whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
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
