import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServerConfig } from '@/types/backup.types';
import { StoredProcedure } from '@/types/backup.types';
import {
  Play,
  Pause,
  SkipForward,
  LogIn,
  LogOut,
  Square,
  Search,
  FileCode,
  Layers,
  Variable,
  Eye,
  Terminal,
  Circle,
  ChevronRight,
  MoreVertical,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { highlightSqlLine } from './sqlHighlight';
import type { DebugCallFrame, DebugVariable, DebugWatch, DebugStatus } from './types';

interface StoredProcedureDebuggerProps {
  server: ServerConfig;
  database: string;
  procedures: StoredProcedure[];
  onLoadProcedure?: (name: string) => void;
  onRefreshProcedures?: () => void;
  isRefreshing?: boolean;
}

const DEFAULT_SOURCE = `-- Select a procedure from the list to view its definition
-- Set breakpoints by clicking in the gutter
-- Use the toolbar to start debugging (F5)`;

const MOCK_CALL_STACK: DebugCallFrame[] = [
  { id: '1', procedureName: 'usp_GetOrderSummary', line: 12, database: 'Northwind' },
  { id: '2', procedureName: 'usp_ProcessOrder', line: 45, database: 'Northwind' },
];

const MOCK_VARIABLES: DebugVariable[] = [
  { name: '@OrderId', value: '10248', type: 'INT' },
  { name: '@TotalAmount', value: '158.00', type: 'DECIMAL(10,2)' },
  { name: '@RowCount', value: '3', type: 'INT' },
  { name: '@ErrorMessage', value: 'NULL', type: 'NVARCHAR(4000)' },
];

type OutputLevel = 'info' | 'warn' | 'error';
interface OutputEntry {
  time: string;
  level: OutputLevel;
  message: string;
}

const MOCK_OUTPUT: OutputEntry[] = [
  { time: '10:32:01', level: 'info', message: 'Procedure execution started' },
  { time: '10:32:01', level: 'info', message: 'Breakpoint hit at line 12' },
  { time: '10:32:02', level: 'info', message: 'Variable @OrderId = 10248' },
];

export function StoredProcedureDebugger({
  server,
  database,
  procedures,
  onLoadProcedure,
  onRefreshProcedures,
  isRefreshing = false,
}: StoredProcedureDebuggerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<StoredProcedure | null>(null);
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set([5, 12]));
  const [currentLine, setCurrentLine] = useState<number | null>(12);
  const [currentColumn, setCurrentColumn] = useState(1);
  const [debugStatus, setDebugStatus] = useState<DebugStatus>('paused');
  const [callStack, setCallStack] = useState<DebugCallFrame[]>(MOCK_CALL_STACK);
  const [variables, setVariables] = useState<DebugVariable[]>(MOCK_VARIABLES);
  const [watches, setWatches] = useState<DebugWatch[]>([
    { id: '1', expression: '@OrderId', value: '10248' },
    { id: '2', expression: '@TotalAmount * 1.1', value: '173.80' },
  ]);
  const [outputLog, setOutputLog] = useState<OutputEntry[]>(MOCK_OUTPUT);
  const [inputParams, setInputParams] = useState<Record<string, string>>({});
  const [activeRightTab, setActiveRightTab] = useState('variables');
  const [newWatchExpression, setNewWatchExpression] = useState('');
  const [stepCount, setStepCount] = useState(3);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(new Date());
  const outputEndRef = useRef<HTMLDivElement>(null);

  const filteredProcedures = useMemo(
    () =>
      procedures.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [procedures, searchQuery]
  );

  const lines = useMemo(() => sourceCode.split('\n'), [sourceCode]);

  const toggleBreakpoint = useCallback((lineNum: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(lineNum)) next.delete(lineNum);
      else next.add(lineNum);
      return next;
    });
  }, []);

  const clearAllBreakpoints = useCallback(() => {
    setBreakpoints(new Set());
  }, []);

  const handleSelectProcedure = useCallback(
    (proc: StoredProcedure) => {
      setSelectedProcedure(proc);
      const def =
        proc.definition ||
        `-- Procedure: ${proc.name}\n-- No definition loaded.\n-- Parameters: ${proc.parameters || 'none'}\n\nBEGIN\n  -- Body\nEND;`;
      setSourceCode(def);
      setCurrentLine(null);
      setCurrentColumn(1);
      onLoadProcedure?.(proc.name);
    },
    [onLoadProcedure]
  );

  const addLog = useCallback((level: OutputLevel, message: string) => {
    setOutputLog((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), level, message },
    ]);
  }, []);

  const clearOutput = useCallback(() => setOutputLog([]), []);

  const handleStartDebug = () => {
    setDebugStatus('running');
    setSessionStartTime(new Date());
    setStepCount(0);
    addLog('info', 'Debug session started');
    setTimeout(() => {
      setDebugStatus('paused');
      setCurrentLine(12);
      setStepCount(3);
      addLog('info', 'Paused at breakpoint (line 12)');
    }, 800);
  };

  const handlePause = () => setDebugStatus('paused');
  const handleStop = () => {
    setDebugStatus('idle');
    setCurrentLine(null);
    setSessionStartTime(null);
    addLog('info', 'Debug session stopped');
  };
  const handleStepOver = () => {
    setCurrentLine((l) => (l ?? 1) + 1);
    setStepCount((c) => c + 1);
    addLog('info', 'Step over');
  };
  const handleStepInto = () => addLog('info', 'Step into');
  const handleStepOut = () => addLog('info', 'Step out');
  const copyVariableValue = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const addWatch = () => {
    if (!newWatchExpression.trim()) return;
    setWatches((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}`,
        expression: newWatchExpression.trim(),
        value: '—',
      },
    ]);
    setNewWatchExpression('');
  };

  const removeWatch = (id: string) => {
    setWatches((prev) => prev.filter((w) => w.id !== id));
  };

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLog]);

  const isRunning = debugStatus === 'running';
  const isPaused = debugStatus === 'paused';
  const canControl = debugStatus === 'running' || debugStatus === 'paused';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        if (debugStatus !== 'idle') handleStop();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (selectedProcedure && !isRunning) handleStartDebug();
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (isRunning) handlePause();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (canControl) handleStepOver();
      } else if (e.key === 'F11' && e.shiftKey) {
        e.preventDefault();
        if (canControl) handleStepOut();
      } else if (e.key === 'F11') {
        e.preventDefault();
        if (canControl) handleStepInto();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProcedure, isRunning, canControl, debugStatus]);

  const executionTimeMs = sessionStartTime
    ? Math.round((Date.now() - sessionStartTime.getTime()) / 1000)
    : 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[560px] gap-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleStartDebug}
                  disabled={!selectedProcedure || isRunning}
                  className="gap-2 shadow-sm"
                >
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Start debugging (F5)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePause}
                  disabled={!isRunning}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pause (F6)</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStepOver}
                  disabled={!canControl}
                  className="gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Step Over
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Step over (F10)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStepInto}
                  disabled={!canControl}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Into
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Step into (F11)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStepOut}
                  disabled={!canControl}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Out
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Step out (Shift+F11)</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStop}
                  disabled={debugStatus === 'idle'}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Stop (Shift+F5)</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 min-w-[120px]" />
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={clearAllBreakpoints} disabled={breakpoints.size === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear all breakpoints
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge
              variant={debugStatus === 'running' ? 'default' : debugStatus === 'paused' ? 'secondary' : 'outline'}
              className="font-mono text-xs px-2.5 py-0.5"
            >
              {debugStatus === 'running' && 'Running'}
              {debugStatus === 'paused' && 'Paused'}
              {debugStatus === 'idle' && 'Idle'}
              {debugStatus === 'finished' && 'Finished'}
            </Badge>
            {selectedProcedure && (
              <span className="text-xs text-muted-foreground truncate max-w-[220px] font-mono">
                {server.name} / {database} / {selectedProcedure.name}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0 gap-3">
          {/* Left: Procedure list */}
          <Card className="w-72 shrink-0 flex flex-col overflow-hidden border shadow-sm">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-sm font-semibold">Procedures</CardTitle>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                    {filteredProcedures.length}
                  </Badge>
                </div>
                {onRefreshProcedures && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onRefreshProcedures}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh procedure list</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="relative mt-2.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search procedures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 scrollbar-thin">
                <div className="py-1">
                  {filteredProcedures.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <FileCode className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-xs text-muted-foreground">
                        {procedures.length === 0
                          ? 'No procedures in this database'
                          : 'No matching procedures'}
                      </p>
                      {procedures.length > 0 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredProcedures.map((proc) => (
                      <button
                        key={proc.name}
                        type="button"
                        onClick={() => handleSelectProcedure(proc)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2.5 text-left rounded-none border-l-2 border-transparent hover:bg-muted/50 transition-colors',
                          selectedProcedure?.name === proc.name
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'text-foreground'
                        )}
                      >
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 opacity-50',
                            selectedProcedure?.name === proc.name && 'opacity-100'
                          )}
                        />
                        <span className="truncate font-mono text-xs flex-1">{proc.name}</span>
                        {proc.parameterCount > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {proc.parameterCount} params
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Center: Source with line numbers and breakpoints */}
          <Card className="flex-1 flex flex-col min-w-0 overflow-hidden border shadow-sm">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/20 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                <CardTitle className="text-sm font-semibold truncate">
                  {selectedProcedure ? selectedProcedure.name : 'Source'}
                </CardTitle>
                {selectedProcedure?.parameters && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline font-mono">
                    ({selectedProcedure.parameters})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {breakpoints.size > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {breakpoints.size} breakpoint{breakpoints.size !== 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-mono">
                  {lines.length} lines
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-hidden bg-[hsl(var(--muted)/0.15)]">
              <ScrollArea className="h-full scrollbar-thin">
                <div className="font-mono text-[13px] leading-[22px]">
                  {lines.map((line, i) => {
                    const lineNum = i + 1;
                    const isBreakpoint = breakpoints.has(lineNum);
                    const isCurrent = currentLine === lineNum;
                    const tokens = highlightSqlLine(line);
                    return (
                      <div
                        key={lineNum}
                        className={cn(
                          'flex items-stretch hover:bg-muted/30 group',
                          isCurrent && 'bg-primary/15 debugger-line-current'
                        )}
                      >
                        <div
                          className={cn(
                            'w-11 shrink-0 flex items-center justify-end pr-2 py-0.5 select-none text-xs border-r min-h-[22px]',
                            isCurrent
                              ? 'debugger-current-line-gutter text-primary font-semibold'
                              : 'bg-muted/30 text-muted-foreground border-border'
                          )}
                          aria-hidden
                        >
                          {isCurrent ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            lineNum
                          )}
                        </div>
                        <button
                          type="button"
                          className="w-7 shrink-0 flex items-center justify-center py-0.5 hover:bg-muted/50 min-h-[22px] border-r border-border/50"
                          onClick={() => toggleBreakpoint(lineNum)}
                          aria-label={isBreakpoint ? `Remove breakpoint ${lineNum}` : `Add breakpoint ${lineNum}`}
                        >
                          {isBreakpoint ? (
                            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                          ) : (
                            <span className="opacity-0 group-hover:opacity-50 w-3 h-3 rounded-full border border-muted-foreground" />
                          )}
                        </button>
                        <div
                          className={cn(
                            'flex-1 py-0.5 pl-3 pr-4 text-left min-h-[22px] whitespace-pre',
                            isCurrent && 'border-l-2 border-primary pl-[calc(0.75rem-2px)]'
                          )}
                        >
                          {tokens.map((t, j) => (
                            <span key={j} className={t.className || undefined}>
                              {t.text}
                            </span>
                          ))}
                          {line === '' && '\u00A0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Variables, Call stack, Watches, Output */}
          <Card className="w-80 shrink-0 flex flex-col overflow-hidden border shadow-sm">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              <Tabs
                value={activeRightTab}
                onValueChange={setActiveRightTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/20 px-2 h-10 gap-0">
                  <TabsTrigger value="variables" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none">
                    <Variable className="h-3.5 w-3.5" />
                    Variables
                  </TabsTrigger>
                  <TabsTrigger value="callstack" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none">
                    <Layers className="h-3.5 w-3.5" />
                    Call Stack
                  </TabsTrigger>
                  <TabsTrigger value="watches" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none">
                    <Eye className="h-3.5 w-3.5" />
                    Watches
                  </TabsTrigger>
                  <TabsTrigger value="output" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none">
                    <Terminal className="h-3.5 w-3.5" />
                    Output
                  </TabsTrigger>
                </TabsList>
                <div className="flex-1 min-h-0 overflow-hidden bg-muted/5">
                  <TabsContent value="variables" className="m-0 h-full data-[state=inactive]:hidden flex flex-col">
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="text-xs py-2.5 font-semibold">Name</TableHead>
                            <TableHead className="text-xs py-2.5 font-semibold">Value</TableHead>
                            <TableHead className="text-xs py-2.5 w-24 font-semibold">Type</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variables.map((v) => (
                            <TableRow key={v.name} className="font-mono text-xs hover:bg-muted/30">
                              <TableCell className="py-2 font-medium">{v.name}</TableCell>
                              <TableCell className="py-2 text-muted-foreground">{v.value}</TableCell>
                              <TableCell className="py-2 text-muted-foreground text-[11px]">{v.type ?? '—'}</TableCell>
                              <TableCell className="py-2 p-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyVariableValue(v.value)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy value</TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="callstack" className="m-0 h-full data-[state=inactive]:hidden">
                    <ScrollArea className="h-full">
                      <div className="p-2.5 space-y-1.5">
                        {callStack.map((frame, idx) => (
                          <div
                            key={frame.id}
                            className={cn(
                              'rounded-lg px-3 py-2.5 text-xs font-mono border transition-colors',
                              idx === 0
                                ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                                : 'bg-muted/30 border-transparent hover:bg-muted/50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-sans font-medium w-5">
                                #{callStack.length - idx}
                              </span>
                              <span className="font-semibold truncate">{frame.procedureName}</span>
                            </div>
                            <div className="text-muted-foreground mt-1 ml-7">
                              Line {frame.line}
                              {frame.database && ` · ${frame.database}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="watches" className="m-0 h-full data-[state=inactive]:hidden flex flex-col">
                    <div className="p-2 flex gap-2 border-b">
                      <Input
                        placeholder="Add watch expression..."
                        value={newWatchExpression}
                        onChange={(e) => setNewWatchExpression(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addWatch()}
                        className="h-8 text-xs font-mono flex-1"
                      />
                      <Button size="sm" variant="secondary" className="shrink-0 gap-1" onClick={addWatch}>
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="text-xs py-2 font-semibold">Expression</TableHead>
                            <TableHead className="text-xs py-2 font-semibold">Value</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {watches.map((w) => (
                            <TableRow key={w.id} className="font-mono text-xs hover:bg-muted/30">
                              <TableCell className="py-2">{w.expression}</TableCell>
                              <TableCell className="py-2 text-muted-foreground">{w.value}</TableCell>
                              <TableCell className="py-2 p-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeWatch(w.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="output" className="m-0 h-full data-[state=inactive]:hidden flex flex-col">
                    <div className="flex justify-end px-2 py-1.5 border-b">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearOutput}>
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 font-mono text-xs space-y-1 min-h-full">
                        {outputLog.length === 0 ? (
                          <div className="text-muted-foreground py-6 text-center">
                            No output yet. Start debugging to see messages.
                          </div>
                        ) : (
                          outputLog.map((entry, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex gap-2 py-1.5 px-2 rounded-md',
                                entry.level === 'error' && 'debugger-output-error bg-destructive/10',
                                entry.level === 'warn' && 'debugger-output-warn bg-amber-500/10',
                                entry.level === 'info' && 'debugger-output-info'
                              )}
                            >
                              <span className="text-muted-foreground shrink-0 w-14">{entry.time}</span>
                              <span className="uppercase text-[10px] font-semibold w-10 shrink-0">
                                {entry.level}
                              </span>
                              <span className="break-all">{entry.message}</span>
                            </div>
                          ))
                        )}
                        <div ref={outputEndRef} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Parameters bar */}
        {selectedProcedure && selectedProcedure.parameterCount > 0 && (
          <Card className="border shadow-sm">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                Run parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 flex flex-wrap items-end gap-4">
              {['@param1', '@param2'].slice(0, selectedProcedure.parameterCount).map((param) => (
                <div key={param} className="flex flex-col gap-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">{param}</Label>
                  <Input
                    className="h-9 w-44 font-mono text-sm"
                    placeholder="Value"
                    value={inputParams[param] ?? ''}
                    onChange={(e) =>
                      setInputParams((prev) => ({ ...prev, [param]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <Button size="sm" variant="secondary" className="gap-2">
                Load defaults
              </Button>
              <Button size="sm" className="gap-2">
                <Play className="h-3.5 w-3.5" />
                Run with params
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status bar */}
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg border bg-muted/20 text-xs text-muted-foreground font-mono">
          <span>Ln {currentLine ?? '—'}, Col {currentColumn}</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {selectedProcedure ? selectedProcedure.name : 'No procedure selected'}
          </span>
          {breakpoints.size > 0 && (
            <span>{breakpoints.size} breakpoint{breakpoints.size !== 1 ? 's' : ''}</span>
          )}
          {sessionStartTime && (debugStatus === 'running' || debugStatus === 'paused') && (
            <span>Steps: {stepCount} · Time: {executionTimeMs}s</span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
