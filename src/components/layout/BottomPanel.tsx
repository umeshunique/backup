import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Terminal, AlertCircle, Trash2, GripHorizontal, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ConsoleLogEntry,
  subscribeToLogs,
  clearLogs,
} from '@/lib/consoleCapture';
import { useBackupStore } from '@/store/backupStore';

const BOTTOM_PANEL_HEIGHT_KEY = 'bottom-panel-height';
const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 560;

function getStoredHeight(): number {
  try {
    const v = localStorage.getItem(BOTTOM_PANEL_HEIGHT_KEY);
    if (v != null) {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n >= MIN_HEIGHT && n <= MAX_HEIGHT) return n;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_HEIGHT;
}

type BottomTabId = 'output' | 'errors' | 'action-output';

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTabId>('action-output');
  const [collapsed, setCollapsed] = useState(true);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const actionLogEntries = useBackupStore((s) => s.actionLogEntries);
  const clearActionLog = useBackupStore((s) => s.clearActionLog);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const latestHeightRef = useRef(0);

  useEffect(() => {
    setPanelHeight(getStoredHeight());
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
    latestHeightRef.current = panelHeight;
    const onMove = (e: MouseEvent) => {
      const delta = resizeStartY.current - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartHeight.current + delta));
      latestHeightRef.current = next;
      setPanelHeight(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(BOTTOM_PANEL_HEIGHT_KEY, String(latestHeightRef.current));
      } catch {
        /* ignore */
      }
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  useEffect(() => {
    return subscribeToLogs(setLogs);
  }, []);

  const errors = logs.filter((e) => e.type === 'error');
  const latestFirst = <T extends { timestamp: Date }>(arr: T[]) =>
    [...arr].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const displayLogs = activeTab === 'output' ? latestFirst(logs) : latestFirst(errors);
  const displayActionLog = [...actionLogEntries].reverse();

  const handleClear = () => {
    if (activeTab === 'action-output') clearActionLog();
    else clearLogs();
  };

  const getLogRowClass = (type: ConsoleLogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive/90 bg-destructive/10 border-destructive/20';
      case 'warn':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-foreground/90 bg-muted/50 border-border';
    }
  };

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border bg-muted/30 flex flex-col',
        collapsed && 'flex-none'
      )}
      style={!collapsed ? { height: panelHeight, minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT } : undefined}
      role="region"
      aria-label="Output panel"
    >
      {/* Resize handle: drag to set fixed height (saved across reloads) */}
      {!collapsed && (
        <button
          type="button"
          onMouseDown={startResize}
          className="w-full h-3 shrink-0 flex items-center justify-center cursor-ns-resize hover:bg-primary/10 border-b border-border/50 transition-colors group"
          title="Drag to resize panel (height is saved)"
          aria-label="Resize panel"
        >
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground rotate-90" />
        </button>
      )}
      {/* Tab bar + collapse */}
      <div className="h-8 shrink-0 flex items-center justify-between border-b border-border bg-muted/50 px-2">
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === 'output'
                ? 'bg-background text-foreground border border-border border-b-0 -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            Output
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('errors')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === 'errors'
                ? 'bg-background text-foreground border border-border border-b-0 -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Error List
            {errors.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-[10px] text-destructive">
                {errors.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('action-output')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === 'action-output'
                ? 'bg-background text-foreground border border-border border-b-0 -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Action Output
            {actionLogEntries.length > 0 && (
              <span className="ml-1 text-muted-foreground font-normal">({actionLogEntries.length})</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClear}
            disabled={activeTab === 'action-output' ? actionLogEntries.length === 0 : logs.length === 0}
            aria-label="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          <ScrollArea className="flex-1 min-h-0 p-2 font-mono text-xs">
            {activeTab === 'action-output' ? (
              displayActionLog.length === 0 ? (
                <div className="text-muted-foreground py-2">
                  Executed queries will appear here (e.g. SELECT, INSERT, UPDATE).
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-10 h-7 text-muted-foreground font-medium">#</TableHead>
                      <TableHead className="w-16 h-7 text-muted-foreground font-medium">Time</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Action</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Message</TableHead>
                      <TableHead className="w-24 text-right text-muted-foreground font-medium">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayActionLog.map((entry, idx) => (
                      <TableRow key={entry.id} className="border-border/50">
                        <TableCell className="py-1 text-muted-foreground tabular-nums">{displayActionLog.length - idx}</TableCell>
                        <TableCell className="py-1 text-muted-foreground">{entry.time}</TableCell>
                        <TableCell className="py-1 max-w-[200px] truncate" title={entry.action}>{entry.action}</TableCell>
                        <TableCell className="py-1">{entry.message}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums text-muted-foreground">{entry.duration}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : displayLogs.length === 0 ? (
              <div className="text-muted-foreground py-2">
                {activeTab === 'output'
                  ? 'Ready. Console output will appear here.'
                  : 'No errors.'}
              </div>
            ) : (
              <div className="space-y-1">
                {displayLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded border px-2 py-1 whitespace-pre-wrap break-words',
                      getLogRowClass(entry.type)
                    )}
                  >
                    <span className="opacity-70 text-[10px] mr-2">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={entry.type === 'log' ? '' : 'font-medium'}>
                      [{entry.type}]
                    </span>{' '}
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="h-6 shrink-0 flex items-center px-3 border-t border-border/50 bg-muted/30 text-[11px] text-muted-foreground">
            {activeTab === 'action-output'
              ? (actionLogEntries.length > 0 ? `${actionLogEntries.length} action(s)` : 'Ready')
              : (logs.length > 0 ? `${logs.length} message(s)` : 'Ready')}
          </div>
        </>
      )}
    </div>
  );
}
