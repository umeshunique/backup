import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ServerConfig } from '@/types/backup.types';
import {
  Play,
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  ListOrdered,
  FileJson,
  FileDown,
  FileCode,
  Plus,
  Pencil,
  PanelTop,
  PanelLeft,
  Maximize2,
  PanelLeftOpen,
  RotateCcw,
  AlignJustify,
  LayoutGrid,
  FileText,
  Search,
  X,
  Zap,
  Activity,
  CalendarClock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { apiClient } from '@/services/apiClient';
import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SqlEditorProps {
  server: ServerConfig;
  database: string;
  /** Prefill from e.g. Code Snippets Library; consumed once applied */
  initialSql?: string | null;
  onInitialSqlConsumed?: () => void;
  /** Controlled SQL (when provided with onSqlChange, parent owns the value for e.g. multi-tab) */
  value?: string;
  onSqlChange?: (sql: string) => void;
}

interface QueryResult {
  success: boolean;
  columns?: string[];
  columnTypes?: string[];
  rows?: any[];
  affectedRows?: number;
  message?: string;
  error?: string;
  executionTime?: number;
}

export const DEFAULT_SQL = 'SELECT * FROM information_schema.tables LIMIT 10;';
const COLUMN_MIN_WIDTH = 180;
const COLUMN_MAX_WIDTH = 720;
const ROW_NUM_WIDTH = 52;
const CHECKBOX_COL_WIDTH = 40;
const ACTIONS_COL_WIDTH = 44;

// SQL keyword abbreviations: type "sel" → "SELECT", "upd" → "UPDATE", etc.
const SQL_ABBREVS: Record<string, string> = {
  sel: 'SELECT', upd: 'UPDATE', del: 'DELETE', ins: 'INSERT',
  cre: 'CREATE', alt: 'ALTER', dro: 'DROP', tru: 'TRUNCATE',
  wh: 'WHERE', gro: 'GROUP', ord: 'ORDER', hav: 'HAVING',
  fro: 'FROM', jo: 'JOIN', lef: 'LEFT', rig: 'RIGHT', inn: 'INNER', ou: 'OUTER',
  on: 'ON', and: 'AND', or: 'OR', not: 'NOT', in: 'IN', lik: 'LIKE',
  lim: 'LIMIT', off: 'OFFSET', by: 'BY', asc: 'ASC', des: 'DESC',
  tab: 'TABLE', vie: 'VIEW', pro: 'PROCEDURE', ind: 'INDEX',
  val: 'VALUES', set: 'SET', int: 'INTO', dis: 'DISTINCT', cou: 'COUNT',
  sum: 'SUM', avg: 'AVG', min: 'MIN', max: 'MAX', nul: 'NULL',
  bet: 'BETWEEN', as: 'AS', cas: 'CASE', whe: 'WHEN', the: 'THEN', els: 'ELSE', end: 'END',
  uni: 'UNION', all: 'ALL', exi: 'EXISTS', gra: 'GRANT', rev: 'REVOKE',
};
const SQL_KEYWORDS = [
  'SELECT', 'UPDATE', 'DELETE', 'INSERT', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
  'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
  'GROUP', 'ORDER', 'HAVING', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'TABLE', 'VIEW', 'PROCEDURE', 'INDEX', 'VALUES', 'SET', 'INTO', 'DISTINCT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NULL', 'BETWEEN', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'UNION', 'ALL', 'EXISTS', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
];

export function SqlEditor({ server, database, initialSql, onInitialSqlConsumed, value, onSqlChange }: SqlEditorProps) {
  const [internalSql, setInternalSql] = useState(DEFAULT_SQL);
  const isControlled = value !== undefined && onSqlChange !== undefined;
  const sqlQuery = isControlled ? value : internalSql;
  const setSqlQuery = isControlled ? (v: string | ((prev: string) => string)) => onSqlChange(typeof v === 'function' ? v(value) : v) : setInternalSql;
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; timestamp: Date }>>([]);
  const [historyExpanded, setHistoryExpanded] = useState<number | null>(null);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [visibleColumnSet, setVisibleColumnSet] = useState<Set<string> | null>(null);
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [showColumnTypes, setShowColumnTypes] = useState(true);
  const [insertTableName, setInsertTableName] = useState('');
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertFormValues, setInsertFormValues] = useState<Record<string, string>>({});
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateFormValues, setUpdateFormValues] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [crudExecuting, setCrudExecuting] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPageSize, setResultsPageSize] = useState(100);
  const [resultsHistoryTab, setResultsHistoryTab] = useState<'results' | 'history'>('results');
  const [queryRowLimit, setQueryRowLimit] = useState(10000);
  const [wrapCellContent, setWrapCellContent] = useState(true);
  const [resultViewMode, setResultViewMode] = useState<'grid' | 'text'>('grid');
  const [resultSearchTerm, setResultSearchTerm] = useState('');
  const [executedQueryExpanded, setExecutedQueryExpanded] = useState(false);
  const databaseExplorerMinimized = useBackupStore((s) => s.databaseExplorerMinimized);
  const setDatabaseExplorerMinimized = useBackupStore((s) => s.setDatabaseExplorerMinimized);
  const getDatabasesForServer = useBackupStore((s) => s.getDatabasesForServer);
  const loadDatabaseSchema = useBackupStore((s) => s.loadDatabaseSchema);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; insertText: string; type: 'keyword' | 'table' | 'procedure' | 'view' | 'function' | 'trigger' | 'event' }>>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const wordBoundsRef = useRef({ start: 0, end: 0 });
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [suggestionBoxRect, setSuggestionBoxRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [splitDirection, setSplitDirection] = useState<'vertical' | 'horizontal'>(() => {
    try {
      const s = localStorage.getItem('sql-editor-split-direction');
      return s === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });
  // Side-by-side (vertical): query left, results right with scroll only on the right
  const isSideBySide = splitDirection === 'vertical';
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  type PanelFocus = 'balanced' | 'query' | 'results';
  const [panelFocus, setPanelFocus] = useState<PanelFocus>('balanced');
  const [editorDragOver, setEditorDragOver] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sql-editor-split-direction', splitDirection);
    } catch {
      /* ignore */
    }
  }, [splitDirection]);

  const resetPanelLayout = useCallback(() => {
    try {
      [
        'sql-editor-split-v3-vertical',
        'sql-editor-split-v3-horizontal',
        'sql-editor-split-v3-vertical-expanded',
        'sql-editor-split-v3-horizontal-expanded',
      ].forEach((k) => localStorage.removeItem(k));
      setPanelFocus('balanced');
      setLayoutResetKey((k) => k + 1);
      toast({ title: 'Layout reset', description: 'Panel sizes reset to default.' });
    } catch {
      setLayoutResetKey((k) => k + 1);
    }
  }, []);

  const expandQueryPanel = useCallback(() => {
    try {
      [
        'sql-editor-split-v3-vertical',
        'sql-editor-split-v3-horizontal',
        'sql-editor-split-v3-vertical-expanded',
        'sql-editor-split-v3-horizontal-expanded',
      ].forEach((k) => localStorage.removeItem(k));
      setPanelFocus('query');
      setLayoutResetKey((k) => k + 1);
    } catch {
      setLayoutResetKey((k) => k + 1);
    }
  }, []);

  const expandResultsPanel = useCallback(() => {
    try {
      [
        'sql-editor-split-v3-vertical',
        'sql-editor-split-v3-horizontal',
        'sql-editor-split-v3-vertical-expanded',
        'sql-editor-split-v3-horizontal-expanded',
      ].forEach((k) => localStorage.removeItem(k));
      setPanelFocus('results');
      setLayoutResetKey((k) => k + 1);
    } catch {
      setLayoutResetKey((k) => k + 1);
    }
  }, []);

  const handleEditorDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEditorDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const name = (file.name || '').toLowerCase();
      if (!name.endsWith('.sql') && !name.endsWith('.txt')) {
        toast({ title: 'Unsupported file', description: 'Drop a .sql or .txt file.', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        setSqlQuery(text);
        toast({ title: 'Query loaded', description: file.name });
      };
      reader.onerror = () => toast({ title: 'Failed to read file', variant: 'destructive' });
      reader.readAsText(file);
    },
    [setSqlQuery]
  );

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setEditorDragOver(true);
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    if (!editorWrapRef.current?.contains(e.relatedTarget as Node)) setEditorDragOver(false);
  }, []);

  useEffect(() => {
    if (initialSql?.trim()) {
      setSqlQuery(initialSql.trim());
      onInitialSqlConsumed?.();
    }
  }, [initialSql, onInitialSqlConsumed]);

  useEffect(() => {
    if (server?.id && database) {
      loadDatabaseSchema(server.id, database);
    }
  }, [server?.id, database, loadDatabaseSchema]);

  // Clear suggestions when server or database changes so we don't show stale table/procedure/view names
  useEffect(() => {
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionBoxRect(null);
  }, [server?.id, database]);

  const dbObjects = useMemo(() => {
    const schemas = getDatabasesForServer(server?.id ?? '');
    const db = schemas.find((s) => s.name === database);
    return {
      tables: (db?.tables ?? []).map((t) => t.name),
      procedures: (db?.procedures ?? []).map((p) => p.name),
      views: (db?.views ?? []).map((v) => v.name),
      functions: (db?.functions ?? []).map((f) => f.name),
      triggers: (db?.triggers ?? []).map((t) => t.name),
      events: (db?.events ?? []).map((e) => e.name),
    };
  }, [getDatabasesForServer, server?.id, database]);

  type SuggestionType = 'keyword' | 'table' | 'procedure' | 'view' | 'function' | 'trigger' | 'event';
  const MAX_TABLES = 50;
  const MAX_PROCEDURES = 50;
  const MAX_VIEWS = 30;
  const MAX_FUNCTIONS = 30;
  const MAX_TRIGGERS = 30;
  const MAX_EVENTS = 20;

  const buildSuggestions = useCallback((prefix: string) => {
    const p = prefix.toLowerCase().trim();
    if (!p) return [];
    const out: Array<{ label: string; insertText: string; type: SuggestionType }> = [];
    const added = new Set<string>();
    const add = (label: string, insertText: string, type: SuggestionType) => {
      const key = type === 'keyword' ? insertText : insertText.trim();
      if (added.has(key)) return;
      added.add(key);
      out.push({ label, insertText, type });
    };
    // 1) Keyword matches (abbrevs + keywords starting with prefix)
    if (SQL_ABBREVS[p]) {
      add(SQL_ABBREVS[p], SQL_ABBREVS[p] + ' ', 'keyword');
    }
    SQL_KEYWORDS.forEach((kw) => {
      if (kw.toLowerCase().startsWith(p) && kw !== SQL_ABBREVS[p]) add(kw, kw + ' ', 'keyword');
    });
    // 2) Tables
    dbObjects.tables.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'table');
    });
    dbObjects.tables.forEach((name) => {
      if (out.filter((x) => x.type === 'table').length >= MAX_TABLES) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'table');
    });
    // 3) Procedures
    dbObjects.procedures.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'procedure');
    });
    dbObjects.procedures.forEach((name) => {
      if (out.filter((x) => x.type === 'procedure').length >= MAX_PROCEDURES) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'procedure');
    });
    // 4) Views
    dbObjects.views.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'view');
    });
    dbObjects.views.forEach((name) => {
      if (out.filter((x) => x.type === 'view').length >= MAX_VIEWS) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'view');
    });
    // 5) Functions
    dbObjects.functions.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'function');
    });
    dbObjects.functions.forEach((name) => {
      if (out.filter((x) => x.type === 'function').length >= MAX_FUNCTIONS) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'function');
    });
    // 6) Triggers
    dbObjects.triggers.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'trigger');
    });
    dbObjects.triggers.forEach((name) => {
      if (out.filter((x) => x.type === 'trigger').length >= MAX_TRIGGERS) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'trigger');
    });
    // 7) Events
    dbObjects.events.forEach((name) => {
      if (name.toLowerCase().startsWith(p)) add(name, name, 'event');
    });
    dbObjects.events.forEach((name) => {
      if (out.filter((x) => x.type === 'event').length >= MAX_EVENTS) return;
      if (!name.toLowerCase().startsWith(p)) add(name, name, 'event');
    });
    return out;
  }, [dbObjects]);

  /** Suggestions after FROM / JOIN / etc.: all tables, views, procedures, functions, triggers, events */
  const buildContextSuggestions = useCallback(() => {
    const out: Array<{ label: string; insertText: string; type: SuggestionType }> = [];
    dbObjects.tables.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'table' }));
    dbObjects.views.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'view' }));
    dbObjects.procedures.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'procedure' }));
    dbObjects.functions.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'function' }));
    dbObjects.triggers.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'trigger' }));
    dbObjects.events.forEach((name) => out.push({ label: name, insertText: name + ' ', type: 'event' }));
    return out;
  }, [dbObjects]);

  const applySuggestion = useCallback((insertText: string) => {
    const { start, end } = wordBoundsRef.current;
    setSqlQuery((prev) => prev.slice(0, start) + insertText + prev.slice(end));
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionBoxRect(null);
  }, []);

  // Reset column state, selection, pagination, and search when result set changes
  useEffect(() => {
    if (queryResult?.columns) {
      setColumnWidths({});
      setVisibleColumnSet(null);
      setSelectedRowIndices(new Set());
      setResultsPage(1);
      setResultSearchTerm('');
    }
  }, [queryResult?.columns?.join(',')]);


  const columns = queryResult?.columns ?? [];
  const columnTypes = queryResult?.columnTypes ?? [];
  const visibleColumns =
    visibleColumnSet && columns.length > 0
      ? columns.filter((c) => visibleColumnSet.has(c))
      : columns;

  const getColWidth = (col: string) =>
    Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, columnWidths[col] ?? COLUMN_MIN_WIDTH));

  const handleResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingCol(col);
    const startX = e.clientX;
    const startW = getColWidth(col);
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setColumnWidths((prev) => ({ ...prev, [col]: Math.max(COLUMN_MIN_WIDTH, startW + delta) }));
    };
    const onUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const executeQuery = useCallback(async () => {
    if (!sqlQuery.trim()) return;

    let queryToRun = sqlQuery.trim();
    // Workbench-style: apply row limit to SELECTs that don't already have LIMIT
    if (queryRowLimit > 0 && /^\s*select\b/i.test(queryToRun) && !/\blimit\s+\d+/i.test(queryToRun) && !queryToRun.includes(';')) {
      queryToRun = queryToRun.replace(/\s*;?\s*$/i, '') + ` LIMIT ${queryRowLimit}`;
    }
    setLastExecutedQuery(queryToRun);
    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: queryToRun
      });

      const executionTime = Date.now() - startTime;

      setQueryResult({
        ...result,
        executionTime
      });

      const parsedTable = (() => {
        const n = queryToRun.replace(/\s+/g, ' ').trim();
        const m = n.match(/FROM\s+(?:`?[\w]+`?\.)?`?([a-zA-Z0-9_]+)`?/i);
        return m ? m[1] : null;
      })();
      if (parsedTable) setInsertTableName(parsedTable);

      setQueryHistory(prev => [
        { query: queryToRun, timestamp: new Date() },
        ...prev.slice(0, 49)
      ]);
    } catch (error: any) {
      setQueryResult({
        success: false,
        error: error.message || 'Query execution failed',
        executionTime: Date.now() - startTime
      });
    } finally {
      setIsExecuting(false);
      // Keep keyboard focus in editor after execution (no layout focus steal)
      const ta = editorWrapRef.current?.querySelector('textarea');
      if (ta && typeof (ta as HTMLTextAreaElement).focus === 'function') {
        requestAnimationFrame(() => (ta as HTMLTextAreaElement).focus());
      }
    }
  }, [sqlQuery, server, database, queryRowLimit]);

  const clearQuery = () => {
    setSqlQuery('');
    setQueryResult(null);
  };

  const loadFromHistory = (query: string) => {
    setSqlQuery(query);
  };

  const colsForExport = queryResult?.columns ?? [];

  const downloadCsv = () => {
    if (!queryResult?.rows || !queryResult.columns) return;
    const csv = [
      (showRowNumbers ? '#,' : '') + colsForExport.join(','),
      ...queryResult.rows.map((row, i) =>
        (showRowNumbers ? `${i + 1},` : '') +
        colsForExport.map(col => {
          const v = row[col];
          const s = v === null || v === undefined ? '' : String(v);
          return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'CSV downloaded' });
  };

  const downloadJson = () => {
    if (!queryResult?.rows || !queryResult.columns) return;
    const arr = queryResult.rows.map(row => {
      const obj: Record<string, unknown> = {};
      colsForExport.forEach(col => { obj[col] = row[col]; });
      return obj;
    });
    const json = JSON.stringify(arr, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'JSON downloaded' });
  };

  const copyAllResults = () => {
    if (!queryResult?.rows || !queryResult.columns) return;
    const header = colsForExport.join('\t');
    const lines = queryResult.rows.map(row =>
      colsForExport.map(col => {
        const v = row[col];
        if (v === null || v === undefined) return '';
        return String(v).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t')
    );
    copyToClipboard([header, ...lines].join('\n'), 'All results copied (tab-separated)');
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => toast({ title: label }));
  };

  const copyRow = (row: Record<string, unknown>, columns: string[]) => {
    const line = columns.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return 'NULL';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',');
    copyToClipboard(line, 'Row copied as CSV');
  };

  /** Format a value for SQL INSERT (MySQL-style: single-quote escape, NULL, numbers unquoted) */
  const formatValueForSql = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  };

  /** Parse main table name from SELECT ... FROM table (or FROM schema.table) */
  const parsedTableFromQuery = (sql: string): string | null => {
    if (!sql?.trim()) return null;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const m = normalized.match(/FROM\s+(?:`?[\w]+`?\.)?`?([a-zA-Z0-9_]+)`?/i);
    return m ? m[1] : null;
  };

  const tableNameForInsert = () => {
    const fromInput = insertTableName.trim();
    if (fromInput) return fromInput.replace(/[^a-zA-Z0-9_]/g, '_');
    const fromQuery = parsedTableFromQuery(lastExecutedQuery);
    return fromQuery || 'table_name';
  };

  const toggleRowSelection = (rowIdx: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIdx)) next.delete(rowIdx);
      else next.add(rowIdx);
      return next;
    });
  };

  const selectAllRows = () => {
    if (!queryResult?.rows?.length) return;
    const visibleIndices = filteredRowsWithIndex.map((x) => x.originalIndex);
    const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every((i) => selectedRowIndices.has(i));
    setSelectedRowIndices(allVisibleSelected ? new Set() : new Set(visibleIndices));
  };

  const copyRowAsInsert = (row: Record<string, unknown>, columns: string[]) => {
    const table = tableNameForInsert();
    const colList = columns.map(c => `\`${c.replace(/`/g, '``')}\``).join(', ');
    const values = columns.map(c => formatValueForSql(row[c])).join(', ');
    const sql = `INSERT INTO \`${table.replace(/`/g, '``')}\` (${colList}) VALUES (${values});`;
    copyToClipboard(sql, 'Row copied as INSERT');
  };

  const copyAsInsert = () => {
    if (!queryResult?.rows?.length || !queryResult.columns?.length) return;
    const table = tableNameForInsert();
    const cols = queryResult.columns;
    const colList = cols.map(c => `\`${c.replace(/`/g, '``')}\``).join(', ');
    const rowsToCopy =
      selectedRowIndices.size > 0
        ? queryResult.rows.filter((_, i) => selectedRowIndices.has(i))
        : queryResult.rows;
    const valueRows = rowsToCopy.map(row =>
      `(${cols.map(c => formatValueForSql(row[c])).join(', ')})`
    );
    const sql = `INSERT INTO \`${table}\` (${colList}) VALUES\n${valueRows.join(',\n')};`;
    const label =
      selectedRowIndices.size > 0
        ? `${selectedRowIndices.size} selected rows copied as INSERT`
        : 'All rows copied as INSERT';
    copyToClipboard(sql, label);
  };

  const formatCellValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  /** CSS class for cell value colour by type (NULL, number, boolean, string, JSON). */
  const getCellValueClassName = (raw: unknown): string => {
    if (raw === null || raw === undefined) return 'text-amber-600 dark:text-amber-400 italic';
    if (typeof raw === 'number' && !Number.isNaN(raw)) return 'text-emerald-600 dark:text-emerald-400';
    if (typeof raw === 'boolean') return 'text-blue-600 dark:text-blue-400 font-medium';
    if (typeof raw === 'object') return 'text-purple-600 dark:text-purple-400';
    return 'text-foreground';
  };

  /** Execute SQL and re-run last SELECT to refresh results. Returns true on success, false on error. */
  const executeSqlAndRefresh = useCallback(
    async (sql: string): Promise<boolean> => {
      setCrudExecuting(true);
      try {
        const crudResult = await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: sql,
        });
        if (!crudResult.success) {
          toast({
            title: 'Error',
            description: crudResult.error || 'Execution failed',
            variant: 'destructive',
          });
          return false;
        }
        if (lastExecutedQuery.trim()) {
          const result = await apiClient.executeQuery({
            host: server.host,
            port: server.port,
            user: server.username,
            password: server.password,
            database,
            type: server.databaseType,
            query: lastExecutedQuery.trim(),
          });
          if (result.success) {
            setQueryResult({ ...result, executionTime: 0 });
          }
        }
        toast({ title: 'Success', description: 'Query executed. Results refreshed.' });
        return true;
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Execution failed',
          variant: 'destructive',
        });
        return false;
      } finally {
        setCrudExecuting(false);
      }
    },
    [server, database, lastExecutedQuery]
  );

  /** Convert form input string to SQL literal for INSERT/UPDATE */
  const formValueToSql = (val: string): string => {
    const s = val.trim();
    if (s === '' || s.toUpperCase() === 'NULL') return 'NULL';
    const n = Number(s);
    if (s !== '' && !Number.isNaN(n)) return String(n);
    return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  };

  const openInsertDialog = () => {
    const cols = queryResult?.columns ?? [];
    setInsertFormValues(Object.fromEntries(cols.map((c) => [c, ''])));
    setInsertDialogOpen(true);
  };

  const openUpdateDialog = () => {
    const cols = queryResult?.columns ?? [];
    const idx = Array.from(selectedRowIndices)[0];
    if (idx == null || !queryResult?.rows?.[idx]) return;
    const row = queryResult.rows[idx];
    const values: Record<string, string> = {};
    cols.forEach((c) => {
      const v = row[c];
      values[c] = v === null || v === undefined ? '' : String(v);
    });
    setUpdateFormValues(values);
    setUpdateDialogOpen(true);
  };

  const handleInsertSubmit = async () => {
    const cols = queryResult?.columns ?? [];
    if (!cols.length) return;
    const table = tableNameForInsert();
    const colList = cols.map((c) => `\`${c.replace(/`/g, '``')}\``).join(', ');
    const values = cols.map((c) => formValueToSql(insertFormValues[c] ?? '')).join(', ');
    const sql = `INSERT INTO \`${table}\` (${colList}) VALUES (${values});`;
    const ok = await executeSqlAndRefresh(sql);
    if (ok) setInsertDialogOpen(false);
  };

  const handleUpdateSubmit = async () => {
    const cols = queryResult?.columns ?? [];
    const idx = Array.from(selectedRowIndices)[0];
    if (idx == null || !queryResult?.rows?.[idx]) return;
    const table = tableNameForInsert();
    const oldRow = queryResult.rows[idx];
    const setClause = cols
      .map((c) => `\`${c.replace(/`/g, '``')}\` = ${formValueToSql(updateFormValues[c] ?? '')}`)
      .join(', ');
    const whereClause = cols
      .map((c) => `\`${c.replace(/`/g, '``')}\` = ${formatValueForSql(oldRow[c])}`)
      .join(' AND ');
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause};`;
    const ok = await executeSqlAndRefresh(sql);
    if (ok) setUpdateDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    const cols = queryResult?.columns ?? [];
    const rows = queryResult?.rows ?? [];
    const table = tableNameForInsert();
    const conditions = Array.from(selectedRowIndices)
      .filter((i) => rows[i])
      .map((i) => {
        const row = rows[i];
        return cols.map((c) => `\`${c.replace(/`/g, '``')}\` = ${formatValueForSql(row[c])}`).join(' AND ');
      })
      .map((cond) => `(${cond})`)
      .join(' OR ');
    if (!conditions) return;
    const sql = `DELETE FROM \`${table}\` WHERE ${conditions};`;
    const ok = await executeSqlAndRefresh(sql);
    if (ok) {
      setDeleteDialogOpen(false);
      setSelectedRowIndices(new Set());
    }
  };

  const columnCount = queryResult?.columns?.length ?? 0;
  const cols = queryResult?.columns ?? [];

  const filteredRowsWithIndex = useMemo(() => {
    const rows = queryResult?.rows ?? [];
    if (!resultSearchTerm.trim()) {
      return rows.map((row, i) => ({ row, originalIndex: i }));
    }
    const term = resultSearchTerm.trim().toLowerCase();
    return rows
      .map((row, i) => ({ row, originalIndex: i }))
      .filter(({ row }) =>
        cols.some((col) => String(row[col] ?? '').toLowerCase().includes(term))
      );
  }, [queryResult?.rows, resultSearchTerm, cols.join(',')]);

  const totalRowsFiltered = filteredRowsWithIndex.length;
  const totalPages = totalRowsFiltered > 0 ? Math.ceil(totalRowsFiltered / resultsPageSize) : 0;
  const resultsPageClamped = totalPages > 0 ? Math.min(resultsPage, totalPages) : 1;
  const paginationStart = (resultsPageClamped - 1) * resultsPageSize;
  const paginationEnd = Math.min(paginationStart + resultsPageSize, totalRowsFiltered);
  const displayedRows = filteredRowsWithIndex.slice(paginationStart, paginationEnd);
  const totalRows = queryResult?.rows?.length ?? 0;
  const rowCount = totalRows;

  // Keep page in valid range when total pages shrink (e.g. after new query)
  useEffect(() => {
    if (totalPages > 0 && resultsPage > totalPages) {
      setResultsPage(totalPages);
    }
  }, [totalPages, resultsPage]);

  const tableMinWidth =
    visibleColumns.length > 0
      ? CHECKBOX_COL_WIDTH +
        ROW_NUM_WIDTH +
        visibleColumns.reduce((sum, col) => sum + getColWidth(col), 0) +
        ACTIONS_COL_WIDTH
      : '100%';
  const selectedCount = selectedRowIndices.size;
  const hasManyColumns = columnCount > 8;

  return (
    <TooltipProvider>
      <div className="sql-editor-root flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden min-w-0">
        <PanelGroup
          key={`${splitDirection}-${layoutResetKey}-${databaseExplorerMinimized ? 'exp' : 'n'}-${panelFocus}`}
          direction={splitDirection}
          className={cn('flex-1 min-h-0 min-w-0 w-full overflow-hidden', splitDirection === 'horizontal' && 'w-full')}
          autoSaveId={databaseExplorerMinimized ? `sql-editor-split-v3-${splitDirection}-expanded` : `sql-editor-split-v3-${splitDirection}`}
        >
          {/* Query panel (top when horizontal, left when vertical). Sizes persisted via autoSaveId; drag handle to resize. */}
          <Panel
            order={1}
            defaultSize={
              panelFocus === 'query' ? 92 : panelFocus === 'results' ? 8 : splitDirection === 'horizontal' ? 35 : 35
            }
            minSize={20}
            maxSize={65}
            className={cn('flex flex-col min-h-0 min-w-0 overflow-hidden', splitDirection === 'horizontal' && 'min-w-0')}
          >
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">Query</CardTitle>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setDatabaseExplorerMinimized(!databaseExplorerMinimized)}
                          aria-label={databaseExplorerMinimized ? 'Show Database Explorer' : 'Expand horizontal (full-width editor)'}
                        >
                          {databaseExplorerMinimized ? (
                            <PanelLeftOpen className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {databaseExplorerMinimized ? 'Show Database Explorer' : 'Expand horizontal — full-width Query Editor'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setSplitDirection((d) => (d === 'vertical' ? 'horizontal' : 'vertical'))}
                          aria-label={splitDirection === 'vertical' ? 'Switch to horizontal layout' : 'Switch to vertical layout'}
                        >
                          {splitDirection === 'vertical' ? (
                            <PanelLeft className="h-4 w-4" />
                          ) : (
                            <PanelTop className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {splitDirection === 'vertical' ? 'Horizontal layout (Query | Results)' : 'Vertical layout (Query above Results)'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn('h-8 w-8 p-0', panelFocus === 'query' && 'bg-primary/20')}
                          onClick={expandQueryPanel}
                          aria-label="Expand query editor"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Expand query editor</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn('h-8 w-8 p-0', panelFocus === 'results' && 'bg-primary/20')}
                          onClick={expandResultsPanel}
                          aria-label="Expand results"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Expand results panel</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={resetPanelLayout}
                          aria-label="Reset panel layout"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset panel sizes to default</TooltipContent>
                    </Tooltip>
                    <Label htmlFor="query-limit" className="text-xs text-muted-foreground whitespace-nowrap">
                      Limit
                    </Label>
                    <Select value={String(queryRowLimit)} onValueChange={(v) => setQueryRowLimit(Number(v))}>
                      <SelectTrigger id="query-limit" className="h-8 w-[110px] font-mono text-xs" title="Max rows for SELECT (applied when no LIMIT in query)">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[100, 500, 1000, 5000, 10000, 25000, 50000].map((n) => (
                          <SelectItem key={n} value={String(n)} className="font-mono">
                            {n.toLocaleString()} rows
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={clearQuery} className="gap-1.5">
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      onClick={executeQuery}
                      disabled={isExecuting || !sqlQuery.trim()}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Play className="h-4 w-4" />
                      {isExecuting ? 'Running…' : 'Run'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden pt-0">
                {/* Query editor: viewport-aware fixed height, vertical scroll only; supports drag-and-drop .sql/.txt */}
                <div
                  className={cn(
                    'sql-editor-query-area relative flex rounded-md border bg-background transition-colors',
                    editorDragOver ? 'border-primary ring-2 ring-primary/30' : 'border-input'
                  )}
                  onDragOver={handleEditorDragOver}
                  onDragLeave={handleEditorDragLeave}
                  onDrop={handleEditorDrop}
                >
                  {editorDragOver && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-primary/10 pointer-events-none font-medium text-primary">
                      Drop .sql or .txt file
                    </div>
                  )}
                  <div className="shrink-0 py-3 pl-3 pr-2 text-right select-none font-mono text-xs text-muted-foreground leading-relaxed border-r border-input bg-muted/30">
                    {(sqlQuery || ' ').split('\n').map((_, i) => (
                      <div key={i} className="h-[1.375rem] leading-[1.375rem]">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div
                    ref={editorWrapRef}
                    className="sql-editor-prism relative flex-1 min-w-0 font-mono text-sm leading-relaxed [&_.textarea]:!min-h-[120px] [&_.textarea]:!py-3 [&_.textarea]:!px-3 [&_.textarea]:!outline-none [&_.textarea]:!resize-none [&_pre]:!p-3 [&_pre]:!pl-2"
                    onKeyDownCapture={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        executeQuery();
                        return;
                      }
                      const ta = e.target instanceof HTMLTextAreaElement ? e.target : null;
                      if (showSuggestions && suggestions.length > 0) {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowSuggestions(false);
                          setSuggestions([]);
                          setSuggestionBoxRect(null);
                          return;
                        }
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          applySuggestion(suggestions[suggestionIndex].insertText);
                          setSuggestionBoxRect(null);
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSuggestionIndex((i) => (i + 1) % suggestions.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
                          return;
                        }
                      }
                      if (ta && e.key === 'Enter') {
                        const textBefore = sqlQuery.slice(0, ta.selectionStart);
                        if (/\b(from|join|into|update|table)\s*$/i.test(textBefore)) {
                          const list = buildContextSuggestions();
                          if (list.length > 0) {
                            e.preventDefault();
                            wordBoundsRef.current = { start: ta.selectionStart, end: ta.selectionStart };
                            setSuggestions(list);
                            setSuggestionIndex(0);
                            setShowSuggestions(true);
                            requestAnimationFrame(() => {
                              const el = editorWrapRef.current;
                              if (el) {
                                const r = el.getBoundingClientRect();
                                setSuggestionBoxRect({ top: r.bottom + 4, left: r.left, width: r.width });
                              }
                            });
                          }
                        }
                      }
                      if (ta && /^[\w]$/.test(e.key)) {
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        const s = sqlQuery.slice(0, start) + e.key + sqlQuery.slice(end);
                        const match = s.match(/\b([\w]*)$/);
                        if (match) {
                          const prefix = match[1];
                          const wordStart = start + e.key.length - prefix.length;
                          const wordEnd = start + e.key.length;
                          if (prefix.length >= 1) {
                            const list = buildSuggestions(prefix);
                            if (list.length > 0) {
                              wordBoundsRef.current = { start: wordStart, end: wordEnd };
                              setSuggestions(list);
                              setSuggestionIndex(0);
                              setShowSuggestions(true);
                              requestAnimationFrame(() => {
                                const el = editorWrapRef.current;
                                if (el) {
                                  const r = el.getBoundingClientRect();
                                  setSuggestionBoxRect({ top: r.bottom + 4, left: r.left, width: r.width });
                                }
                              });
                            } else {
                              setShowSuggestions(false);
                            }
                          }
                        }
                      } else if (ta && (e.key === 'Backspace' || e.key === ' ')) {
                        setShowSuggestions(false);
                        setSuggestionBoxRect(null);
                      }
                    }}
                  >
                    <Editor
                      value={sqlQuery}
                      onValueChange={setSqlQuery}
                      highlight={(code) => Prism.highlight(code, Prism.languages.sql, 'sql')}
                      placeholder="SELECT * FROM ..."
                      padding={12}
                      style={{
                        minHeight: 160,
                        width: '100%',
                        fontSize: '0.875rem',
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      }}
                      textareaClassName="focus:outline-none focus:ring-0"
                      preClassName="!m-0 !bg-transparent !overflow-visible"
                    />
                    {showSuggestions && suggestions.length > 0 && suggestionBoxRect &&
                      createPortal(
                        <div
                          className="fixed z-[100] max-h-56 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg"
                          role="listbox"
                          aria-label="SQL suggestions"
                          style={{
                            top: suggestionBoxRect.top,
                            left: suggestionBoxRect.left,
                            width: Math.max(suggestionBoxRect.width, 280),
                          }}
                        >
                          {suggestions.map((s, i) => (
                            <button
                              key={`${s.type}-${s.label}-${i}`}
                              type="button"
                              role="option"
                              aria-selected={i === suggestionIndex}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-mono',
                                i === suggestionIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'
                              )}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applySuggestion(s.insertText);
                              }}
                            >
                              {s.type === 'keyword' && <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                              {s.type === 'table' && <Columns className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                              {s.type === 'procedure' && <ListOrdered className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                              {s.type === 'view' && <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                              {s.type === 'function' && <Zap className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
                              {s.type === 'trigger' && <Activity className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                              {s.type === 'event' && <CalendarClock className="h-3.5 w-3.5 shrink-0 text-cyan-500" />}
                              <span>{s.label}</span>
                              <span className="ml-auto text-xs text-muted-foreground capitalize">{s.type}</span>
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 gap-2">
                  <span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Ctrl</kbd>
                    <span className="mx-1">+</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>
                    <span className="ml-1.5">run</span>
                    <span className="mx-2">·</span>
                    {server.name} / {database}
                  </span>
                  <span className="shrink-0">
                    {queryResult == null && !isExecuting && 'Ready'}
                    {isExecuting && 'Running…'}
                    {queryResult != null && !isExecuting && (
                      queryResult.success ? (
                        <span className="text-green-600 dark:text-green-400">
                          Query completed · {queryResult.executionTime ?? 0} ms
                        </span>
                      ) : (
                        <span className="text-destructive">Error</span>
                      )
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Panel>

          <PanelResizeHandle
            className={cn(
              'shrink-0 flex items-center justify-center bg-muted/80 hover:bg-primary/20 data-[resize-handle-active]:bg-primary/50 transition-[background-color,border-color] duration-150 select-none',
              splitDirection === 'vertical'
                ? 'w-6 cursor-col-resize min-w-6 border-x border-border/60'
                : 'h-6 cursor-row-resize min-h-6 border-y border-border/60'
            )}
            style={splitDirection === 'horizontal' ? { cursor: 'row-resize' } : undefined}
            title={splitDirection === 'vertical' ? 'Drag to resize Query | Results (saved automatically)' : 'Drag to resize Query / Results (saved automatically)'}
          >
            <span
              className={cn(
                'rounded-full bg-muted-foreground/50 hover:bg-primary/70 data-[resize-handle-active]:bg-primary transition-opacity duration-150',
                splitDirection === 'vertical' ? 'w-2 h-16' : 'h-2 w-20'
              )}
              aria-hidden
            />
          </PanelResizeHandle>

          {/* Results panel (bottom when horizontal, right when vertical). Sizes persisted; drag handle to resize. */}
          <Panel
            order={2}
            defaultSize={
              panelFocus === 'results' ? 92 : panelFocus === 'query' ? 8 : splitDirection === 'horizontal' ? 65 : 65
            }
            minSize={35}
            maxSize={80}
            className={cn('flex flex-col min-h-0 min-w-0 overflow-hidden', splitDirection === 'horizontal' && 'min-w-0')}
          >
            <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-muted/5 rounded-b-lg" style={{ minHeight: 0 }}>
              {/* Tabs: fixed at top */}
              <div className="flex border-b border-border shrink-0 bg-muted/30 px-1">
                <button
                  type="button"
                  onClick={() => setResultsHistoryTab('results')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-t transition-colors',
                    resultsHistoryTab === 'results'
                      ? 'bg-background text-foreground border border-border border-b-0 -mb-px'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {queryResult ? (
                    <>Results {queryResult.success ? 'OK' : 'Error'}</>
                  ) : (
                    'Results'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResultsHistoryTab('history')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-t transition-colors',
                    resultsHistoryTab === 'history'
                      ? 'bg-background text-foreground border border-border border-b-0 -mb-px'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  History
                  {queryHistory.length > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({queryHistory.length})
                    </span>
                  )}
                </button>
              </div>
              {/* Single scroll area for result content only; tabs stay fixed. Height fixed — no resize on query run. */}
              <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden" style={{ minHeight: 260, flex: '1 1 0' }}>
                {resultsHistoryTab === 'results' && (
                  <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden" style={{ minHeight: 0, flex: '1 1 0' }}>
                    {/* Result toolbar: fixed; no scroll */}
                    {queryResult && (
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/20 shrink-0">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setResultViewMode('grid')}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors',
                              resultViewMode === 'grid' ? 'bg-background text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Result Grid
                          </button>
                          <button
                            type="button"
                            onClick={() => setResultViewMode('text')}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors',
                              resultViewMode === 'text' ? 'bg-background text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Text Output
                          </button>
                        </div>
                        {resultViewMode === 'grid' && (
                          <>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[220px]">
                              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <Input
                                placeholder="Search in results..."
                                value={resultSearchTerm}
                                onChange={(e) => {
                                  setResultSearchTerm(e.target.value);
                                  setResultsPage(1);
                                }}
                                className="h-7 text-xs font-normal"
                              />
                              {resultSearchTerm && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => { setResultSearchTerm(''); setResultsPage(1); }}
                                  aria-label="Clear search"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn('h-7 gap-1.5 text-xs', wrapCellContent && 'bg-muted')}
                              onClick={() => setWrapCellContent((v) => !v)}
                              title="Wrap cell content"
                            >
                              <AlignJustify className="h-3.5 w-3.5" />
                              Wrap Cell Content
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    {/* Result content: Card header compact; only table/content scrolls */}
        {/* Query Results */}
        {queryResult && (
          <Card className="flex flex-col flex-1 min-h-0 min-w-0 border-0 shadow-none overflow-hidden bg-transparent">
            <CardHeader className="p-3 pb-2 space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Results</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {queryResult.success ? (
                    <Badge variant="default" className="gap-1 font-normal">
                      <CheckCircle2 className="h-3 w-3" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 font-normal">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                  {queryResult.executionTime != null && (
                    <Badge variant="secondary" className="gap-1 font-mono font-normal">
                      <Clock className="h-3 w-3" />
                      {queryResult.executionTime} ms
                    </Badge>
                  )}
                  {queryResult.rows && (
                    <>
                      <Badge variant="outline" className="font-mono font-normal">
                        {queryResult.rows.length} row{queryResult.rows.length !== 1 ? 's' : ''}
                      </Badge>
                      {columnCount > 0 && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <Columns className="h-3 w-3" />
                          {columnCount} col{columnCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </>
                  )}
                  {queryResult.affectedRows != null && (
                    <Badge variant="outline" className="font-mono font-normal">
                      {queryResult.affectedRows} affected
                    </Badge>
                  )}
                  {queryResult.rows && queryResult.rows.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={openInsertDialog}
                        disabled={crudExecuting}
                        title="Insert new row"
                      >
                        <Plus className="h-4 w-4" />
                        Insert
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={openUpdateDialog}
                        disabled={crudExecuting || selectedCount !== 1}
                        title="Update selected row (select exactly one)"
                      >
                        <Pencil className="h-4 w-4" />
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={crudExecuting || selectedCount === 0}
                        title="Delete selected row(s)"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={copyAllResults}
                      >
                        <Copy className="h-4 w-4" />
                        Copy all
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={copyAsInsert}
                        title="Copy selected or all rows as INSERT (table from query or field below)"
                      >
                        <FileCode className="h-4 w-4" />
                        {selectedCount > 0 ? `Copy ${selectedCount} as INSERT` : 'Copy as INSERT'}
                      </Button>
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="insert-table-name" className="text-xs text-muted-foreground whitespace-nowrap">
                          Table:
                        </Label>
                        <Input
                          id="insert-table-name"
                          placeholder={parsedTableFromQuery(lastExecutedQuery) || 'table_name'}
                          value={insertTableName}
                          onChange={(e) => setInsertTableName(e.target.value)}
                          className="h-8 w-32 font-mono text-xs"
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <FileDown className="h-4 w-4" />
                            Export
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={downloadCsv} className="gap-2">
                            <Download className="h-4 w-4" />
                            Download CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={downloadJson} className="gap-2">
                            <FileJson className="h-4 w-4" />
                            Download JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={copyAsInsert} className="gap-2">
                            <FileCode className="h-4 w-4" />
                            {selectedCount > 0 ? `Copy ${selectedCount} selected as INSERT` : 'Copy all as INSERT'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>

              {lastExecutedQuery && (
                <div className="rounded-md border bg-muted/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExecutedQueryExpanded((e) => !e)}
                    className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Executed query
                    </span>
                    <span className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(lastExecutedQuery, 'Query copied'); }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {executedQueryExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </span>
                  </button>
                  {executedQueryExpanded && (
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words overflow-x-auto max-h-24 overflow-y-auto px-2 pb-2 pt-0 border-t border-border/50" title={lastExecutedQuery}>
                      {lastExecutedQuery}
                    </pre>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-0 pb-0 px-0 flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
              {resultViewMode === 'text' && !queryResult.error ? (
                <div className="sql-editor-results-area border rounded-md bg-muted/20">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words">
                    {queryResult.rows && queryResult.columns
                      ? JSON.stringify(queryResult.rows, null, 2)
                      : queryResult.affectedRows != null
                        ? `${queryResult.affectedRows} row(s) affected.`
                        : queryResult.message ?? 'OK'}
                  </pre>
                </div>
              ) : queryResult.error ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-mono text-destructive whitespace-pre-wrap break-words">
                    {queryResult.error}
                  </p>
                </div>
              ) : queryResult.rows && queryResult.rows.length > 0 && queryResult.columns ? (
                <div className="flex flex-col flex-1 min-h-0 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-7 gap-1.5', showRowNumbers ? 'text-foreground bg-muted/60' : 'text-muted-foreground')}
                        onClick={() => setShowRowNumbers((v) => !v)}
                        title={showRowNumbers ? 'Hide row numbers' : 'Show row numbers'}
                        aria-pressed={showRowNumbers}
                      >
                        <ListOrdered className="h-3.5 w-3.5" />
                        Row #
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-7 gap-1.5', showColumnTypes ? 'text-foreground bg-muted/60' : 'text-muted-foreground')}
                        onClick={() => setShowColumnTypes((v) => !v)}
                        title={showColumnTypes ? 'Hide column types' : 'Show column types'}
                        aria-pressed={showColumnTypes}
                      >
                        <Columns className="h-3.5 w-3.5" />
                        Types
                      </Button>
                      {hasManyColumns && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground">
                              <Columns className="h-3.5 w-3.5" />
                              Columns ({visibleColumns.length}/{columnCount})
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                            {columns.map((col) => {
                              const visible = !visibleColumnSet || visibleColumnSet.has(col);
                              return (
                                <DropdownMenuItem
                                  key={col}
                                  onSelect={(e) => e.preventDefault()}
                                  className="gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={visible}
                                    onChange={() => {
                                      setVisibleColumnSet((prev) => {
                                        const next = new Set(prev ?? columns);
                                        if (next.has(col)) next.delete(col);
                                        else next.add(col);
                                        if (next.size === 0) return null;
                                        if (next.size === columns.length) return null;
                                        return next;
                                      });
                                    }}
                                    className="rounded border-input"
                                  />
                                  <span className="font-mono text-xs truncate flex-1" title={col}>
                                    {col}
                                  </span>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {columnCount > 4 && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap" title="Scroll the table horizontally to see all columns">
                          Scroll → to see all {columnCount} columns
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                        <Select
                          value={String(resultsPageSize)}
                          onValueChange={(v) => {
                            setResultsPageSize(Number(v));
                            setResultsPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[72px] font-mono text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[25, 50, 100, 200, 500].map((n) => (
                              <SelectItem key={n} value={String(n)} className="font-mono">
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">
                          {totalRowsFiltered === 0
                            ? '0'
                            : `${paginationStart + 1}–${paginationEnd}`}{' '}
                          of {totalRowsFiltered} row{totalRowsFiltered !== 1 ? 's' : ''}
                          {resultSearchTerm.trim() && totalRowsFiltered !== totalRows && (
                            <span className="text-muted-foreground/80"> (of {totalRows} total)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={totalPages <= 1 || resultsPageClamped <= 1}
                            onClick={() => setResultsPage(1)}
                            aria-label="First page"
                          >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={totalPages <= 1 || resultsPageClamped <= 1}
                            onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <span className="px-2 font-mono tabular-nums min-w-[4rem] text-center">
                            Page {resultsPageClamped} of {totalPages || 1}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={totalPages <= 1 || resultsPageClamped >= totalPages}
                            onClick={() => setResultsPage((p) => Math.min(totalPages, p + 1))}
                            aria-label="Next page"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={totalPages <= 1 || resultsPageClamped >= totalPages}
                            onClick={() => setResultsPage(totalPages)}
                            aria-label="Last page"
                          >
                            <ChevronsRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="sql-editor-results-area relative z-10 rounded-lg border border-border/80 bg-muted/10 sql-results-table"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                    }}
                    role="region"
                    aria-label="Query results grid"
                  >
                    <table
                      className="border-collapse text-sm font-mono sql-results-table-grid"
                      style={{ minWidth: tableMinWidth, width: 'max-content' }}
                    >
                      <thead>
                        <tr className="border-b bg-muted/50 sticky top-0 z-10 shadow-[0_1px_0_0_hsl(var(--border))] backdrop-blur-sm">
                          <th
                            className="h-11 px-1 text-center align-middle font-semibold text-foreground/80 bg-primary/10 backdrop-blur-sm sticky left-0 z-20 border-r border-primary/20 shadow-[1px_0_0_0_hsl(var(--border))]"
                            style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Checkbox
                                  checked={
                                    filteredRowsWithIndex.length > 0 &&
                                    filteredRowsWithIndex.every(({ originalIndex }) => selectedRowIndices.has(originalIndex))
                                  }
                                  onCheckedChange={selectAllRows}
                                  aria-label="Select all rows"
                                  className="h-4 w-4"
                                />
                              </TooltipTrigger>
                              <TooltipContent>Select all / none</TooltipContent>
                            </Tooltip>
                          </th>
                          {showRowNumbers && (
                            <th
                              className="h-11 px-2 text-left align-middle font-semibold text-foreground/80 bg-primary/10 backdrop-blur-sm sticky z-20 border-r border-primary/20 shadow-[1px_0_0_0_hsl(var(--border))]"
                              style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, left: CHECKBOX_COL_WIDTH }}
                            >
                              #
                            </th>
                          )}
                          {visibleColumns.map((col) => {
                            const w = getColWidth(col);
                            const typeStr = showColumnTypes && columnTypes[columns.indexOf(col)];
                            return (
                              <th
                                key={col}
                                className="relative h-11 px-2 text-left align-middle font-semibold text-foreground/80 bg-primary/10 backdrop-blur-sm select-none border-r border-primary/20"
                                style={{ width: w, minWidth: w, maxWidth: w }}
                              >
                                <div className={cn('flex flex-col gap-0.5 min-w-0', wrapCellContent ? 'break-words' : 'truncate')}>
                                  <span className={cn('font-medium text-foreground', wrapCellContent ? 'break-words line-clamp-2' : 'truncate')} title={col}>
                                    {col}
                                  </span>
                                  {typeStr && (
                                    <span className={cn('text-[10px] font-normal text-muted-foreground', wrapCellContent ? 'break-words' : 'truncate')}>
                                      {typeStr}
                                    </span>
                                  )}
                                </div>
                                <div
                                  role="separator"
                                  aria-label={`Resize ${col}`}
                                  className={cn(
                                    'absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary',
                                    resizingCol === col && 'bg-primary'
                                  )}
                                  onMouseDown={(e) => handleResizeStart(col, e)}
                                />
                              </th>
                            );
                          })}
                          <th
                            className="h-11 px-1 text-center align-middle font-semibold text-foreground/80 bg-primary/10 backdrop-blur-sm sticky right-0 border-l border-primary/20"
                            style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }}
                            title="Copy row"
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.map(({ row, originalIndex: globalRowIdx }, rowIdx) => {
                          const isSelected = selectedRowIndices.has(globalRowIdx);
                          return (
                          <tr
                            key={globalRowIdx}
                            className={cn(
                              'border-b border-border/50 hover:bg-muted/30 group',
                              rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/15',
                              isSelected && '!bg-primary/15'
                            )}
                          >
                            <td
                              className={cn(
                                'px-1 py-1.5 align-middle text-center sticky left-0 z-10 border-r border-border/40',
                                rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                              )}
                              style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRowSelection(globalRowIdx)}
                                aria-label={`Select row ${globalRowIdx + 1}`}
                                className="h-4 w-4"
                              />
                            </td>
                            {showRowNumbers && (
                              <td
                                className={cn(
                                  'px-2 py-1.5 align-top text-muted-foreground sticky z-10 border-r border-border/40 font-mono text-xs tabular-nums',
                                  rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                )}
                                style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, left: CHECKBOX_COL_WIDTH }}
                              >
                                {globalRowIdx + 1}
                              </td>
                            )}
                            {visibleColumns.map((col) => {
                              const raw = row[col];
                              const display = formatCellValue(raw);
                              const isLong = display.length > 60;
                              const w = getColWidth(col);
                              const valueClass = getCellValueClassName(raw);
                              return (
                                <td
                                  key={col}
                                  className={cn(
                                    'px-2 py-1.5 align-top text-xs break-words border-r border-border/40',
                                    isLong && 'max-w-0'
                                  )}
                                  style={{ width: w, minWidth: w, maxWidth: w }}
                                >
                                  {raw === null || raw === undefined ? (
                                    <span className={valueClass}>NULL</span>
                                  ) : wrapCellContent ? (
                                    <span
                                      className={cn('cursor-pointer hover:bg-muted/50 rounded px-0.5 -mx-0.5 block whitespace-pre-wrap break-words', valueClass)}
                                      title="Click to copy"
                                      onClick={() => copyToClipboard(display, 'Cell copied')}
                                    >
                                      {display}
                                    </span>
                                  ) : isLong ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className={cn('cursor-pointer block truncate w-full hover:bg-muted/50 rounded px-0.5 -mx-0.5', valueClass)}
                                          title="Click to copy"
                                          onClick={() => copyToClipboard(display, 'Cell copied')}
                                        >
                                          {display}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-md max-h-48 overflow-auto break-all whitespace-pre-wrap font-mono text-xs"
                                      >
                                        {display}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span
                                      className={cn('cursor-pointer hover:bg-muted/50 rounded px-0.5 -mx-0.5 inline-block min-w-0 truncate max-w-full', valueClass)}
                                      title="Click to copy"
                                      onClick={() => copyToClipboard(display, 'Cell copied')}
                                    >
                                      {display}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td
                              className={cn(
                                'p-1 align-middle text-center sticky right-0 border-l border-border/40',
                                rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                              )}
                              style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => copyRow(row, queryResult!.columns!)}
                                    className="gap-2"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy row (CSV)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => copyRowAsInsert(row, queryResult!.columns!)}
                                    className="gap-2"
                                  >
                                    <FileCode className="h-3.5 w-3.5" />
                                    Copy row as INSERT
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : queryResult.affectedRows !== undefined ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Query executed successfully. <strong>{queryResult.affectedRows}</strong> row(s) affected.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    {queryResult.message || 'Query executed successfully.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {!queryResult && (
          <div className="flex flex-1 min-h-0 min-w-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Run a query to see results here.</p>
          </div>
        )}
                  </div>
                )}
                {resultsHistoryTab === 'history' && (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-2">
        {/* Query History */}
        {queryHistory.length > 0 ? (
          <Card className="flex flex-col min-h-0 h-full">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">History</CardTitle>
                <span className="text-xs text-muted-foreground">
                  Last {queryHistory.length} run{queryHistory.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-1.5 pr-2">
                  {queryHistory.map((item, idx) => {
                    const isExpanded = historyExpanded === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-md border bg-muted/20 overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors min-w-0"
                          onClick={() => setHistoryExpanded(isExpanded ? null : idx)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="text-xs font-mono truncate flex-1 min-w-0">
                            {item.query}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadFromHistory(item.query);
                            }}
                          >
                            Load
                          </Button>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-muted/10 px-2.5 py-2">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground max-h-36 overflow-y-auto overflow-x-auto">
                              {item.query}
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1.5 h-6 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.query, 'Query copied');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <div className="p-3 text-xs text-muted-foreground">No runs yet. Execute a query to see history here.</div>
        )}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>

        {/* Insert row dialog */}
        <Dialog open={insertDialogOpen} onOpenChange={setInsertDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-4">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Insert row</DialogTitle>
              <DialogDescription>
                Add a new row to <span className="font-mono">{tableNameForInsert()}</span>. Leave empty or type NULL for null.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] min-h-[120px] max-h-[400px] w-full rounded-md border px-3">
              <div className="space-y-3 py-2 pr-4">
                {(queryResult?.columns ?? []).map((col) => (
                  <div key={col} className="space-y-1.5">
                    <Label htmlFor={`insert-${col}`} className="text-xs font-mono">
                      {col}
                    </Label>
                    <Input
                      id={`insert-${col}`}
                      value={insertFormValues[col] ?? ''}
                      onChange={(e) =>
                        setInsertFormValues((prev) => ({ ...prev, [col]: e.target.value }))
                      }
                      placeholder="NULL"
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => setInsertDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsertSubmit} disabled={crudExecuting}>
                {crudExecuting ? 'Executing…' : 'Insert'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update row dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-4">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Update row</DialogTitle>
              <DialogDescription>
                Edit values for selected row in <span className="font-mono">{tableNameForInsert()}</span>. WHERE uses current values.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] min-h-[120px] max-h-[400px] w-full rounded-md border px-3">
              <div className="space-y-3 py-2 pr-4">
                {(queryResult?.columns ?? []).map((col) => (
                  <div key={col} className="space-y-1.5">
                    <Label htmlFor={`update-${col}`} className="text-xs font-mono">
                      {col}
                    </Label>
                    <Input
                      id={`update-${col}`}
                      value={updateFormValues[col] ?? ''}
                      onChange={(e) =>
                        setUpdateFormValues((prev) => ({ ...prev, [col]: e.target.value }))
                      }
                      placeholder="NULL"
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSubmit} disabled={crudExecuting}>
                {crudExecuting ? 'Executing…' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected row(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedCount === 1
                  ? 'This row will be deleted from '
                  : `${selectedCount} rows will be deleted from `}
                <span className="font-mono">{tableNameForInsert()}</span>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={crudExecuting}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={crudExecuting}
              >
                {crudExecuting ? 'Deleting…' : `Delete ${selectedCount} row(s)`}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
