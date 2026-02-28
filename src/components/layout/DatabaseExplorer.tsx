import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackupStore } from '@/store/backupStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  Table2,
  Eye,
  FileCode,
  FunctionSquare,
  Zap,
  Calendar,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Square,
  Search,
  X,
  MoreHorizontal,
  RefreshCw,
  Archive,
  RotateCcw,
  Upload,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAddServer } from '@/contexts/AddServerContext';
import { apiClient } from '@/services/apiClient';
import { escapeIdentifier } from '@/utils/sqlIdentifier';
const PANEL_MIN_WIDTH = 200;
const PANEL_MAX_WIDTH = 560;
const PANEL_DEFAULT_WIDTH = 320;
const PANEL_STORAGE_KEY = 'database-explorer-panel-width';
const MINIMIZED_WIDTH = 28;

interface DatabaseExplorerProps {
  /** When set, "Add server" opens this callback instead of navigating to Servers tab. */
  onAddServerClick?: () => void;
}

export function DatabaseExplorer({ onAddServerClick }: DatabaseExplorerProps = {}) {
  const navigate = useNavigate();
  const openAddServerFromContext = useAddServer();
  const {
    servers,
    selectedServerId,
    selectedDatabaseName,
    selectedTableName,
    selectServer,
    selectDatabase,
    setSelectedTableName,
    loadDatabasesForServer,
    loadDatabaseSchema,
    getDatabasesForServer,
    getServerById,
    databaseSchemas,
    setActiveTab,
    setSqlEditorInitialSql,
    databaseExplorerMinimized: isMinimized,
    setDatabaseExplorerMinimized,
  } = useBackupStore();

  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  /** Keys: `${serverId}:${dbName}:tables` | `:views` | `:procedures` | `:functions` | `:triggers` | `:events` */
  const [expandedObjectCategories, setExpandedObjectCategories] = useState<Set<string>>(new Set());

  /** When non-null, schema `${serverId}:${dbName}` is currently refreshing. */
  const [refreshingSchemaKey, setRefreshingSchemaKey] = useState<string | null>(null);

  /** Search/filter for database and schema object names (case-insensitive). */
  const [schemaFilter, setSchemaFilter] = useState('');
  /** Tab for bottom left panel: 'object-info' | 'session' */
  const [objectInfoTab, setObjectInfoTab] = useState<'object-info' | 'session'>('object-info');
  /** Object Info / Session panel starts collapsed; user can expand when needed */
  const [objectInfoPanelCollapsed, setObjectInfoPanelCollapsed] = useState(true);

  /** DDL dialog: show CREATE statement (SHOW CREATE TABLE/VIEW/...) result */
  const [ddlDialogOpen, setDdlDialogOpen] = useState(false);
  const [ddlDialogTitle, setDdlDialogTitle] = useState('');
  const [ddlDialogContent, setDdlDialogContent] = useState('');
  const [ddlDialogLoading, setDdlDialogLoading] = useState(false);

  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const w = localStorage.getItem(PANEL_STORAGE_KEY);
      if (w != null) {
        const n = Number(w);
        if (n >= PANEL_MIN_WIDTH && n <= PANEL_MAX_WIDTH) return n;
      }
    } catch (_) {}
    return PANEL_DEFAULT_WIDTH;
  });
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMinimized) return;
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth));
    } catch (_) {}
  }, [panelWidth, isMinimized]);

  // When user types a filter, expand all servers so matching databases are visible
  useEffect(() => {
    const norm = schemaFilter.trim().toLowerCase();
    if (!norm || servers.length === 0) return;
    setExpandedServers((prev) => {
      const next = new Set(prev);
      servers.forEach((s) => next.add(s.id));
      return next;
    });
  }, [schemaFilter, servers]);

  const handleResize = useCallback((e: MouseEvent) => {
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (move: MouseEvent) => {
      const delta = move.clientX - startX;
      const next = Math.round(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, startW + delta)));
      setPanelWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const toggleMinimize = () => setDatabaseExplorerMinimized(!isMinimized);
  const setMaximized = () => {
    setDatabaseExplorerMinimized(false);
    setPanelWidth(PANEL_MAX_WIDTH);
  };

  useEffect(() => {
    const el = resizeRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleResize(e);
    };
    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  }, [handleResize]);

  const toggleServer = async (serverId: string) => {
    const next = new Set(expandedServers);
    if (next.has(serverId)) {
      next.delete(serverId);
    } else {
      next.add(serverId);
      setExpandedServers(next);
      await loadDatabasesForServer(serverId);
      return;
    }
    setExpandedServers(next);
  };

  const OBJECT_CATEGORIES = ['tables', 'views', 'procedures', 'functions', 'triggers', 'events'] as const;

  const toggleDatabase = async (serverId: string, dbName: string) => {
    const key = `${serverId}:${dbName}`;
    const next = new Set(expandedDatabases);
    if (next.has(key)) {
      next.delete(key);
      setExpandedDatabases(next);
      setExpandedObjectCategories((prev) => {
        const nextCat = new Set(prev);
        const prefix = `${serverId}:${dbName}:`;
        [...nextCat].forEach((k) => {
          if (k.startsWith(prefix)) nextCat.delete(k);
        });
        return nextCat;
      });
    } else {
      next.add(key);
      setExpandedDatabases(next);
      await loadDatabaseSchema(serverId, dbName);
      setExpandedObjectCategories((prev) => {
        const nextCat = new Set(prev);
        OBJECT_CATEGORIES.forEach((cat) =>
          nextCat.add(objectCategoryKey(serverId, dbName, cat))
        );
        return nextCat;
      });
    }
  };

  const objectCategoryKey = (serverId: string, dbName: string, category: string) =>
    `${serverId}:${dbName}:${category}`;

  const toggleObjectCategory = (serverId: string, dbName: string, category: string) => {
    const key = objectCategoryKey(serverId, dbName, category);
    setExpandedObjectCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Open SQL Editor with DML: SELECT for table/view, CALL for procedure, etc. */
  const openObjectDml = (
    serverId: string,
    dbName: string,
    kind: 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event',
    objectName: string
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedName = escapeIdentifier(objectName, dbType);
    let sql = '';
    switch (kind) {
      case 'table':
      case 'view':
        sql = dbType === 'mssql'
          ? `SELECT TOP 100 * FROM ${escapedDb}.${escapedName};\n`
          : `SELECT * FROM ${escapedDb}.${escapedName} LIMIT 100;\n`;
        break;
      case 'procedure':
        sql = `EXEC ${escapedDb}.${escapedName};\n`;
        break;
      case 'function':
        sql = dbType === 'mysql'
          ? `SELECT ${escapedDb}.${escapedName}();\n`
          : `SELECT ${escapedDb}.${escapedName}();\n`;
        break;
      case 'trigger':
        sql = dbType === 'mysql'
          ? `SHOW CREATE TRIGGER ${escapedDb}.${escapedName};\n`
          : `-- Triggers: use Object Explorer or sys.triggers in MSSQL\n`;
        break;
      case 'event':
        sql = dbType === 'mysql'
          ? `SHOW CREATE EVENT ${escapedDb}.${escapedName};\n`
          : `-- Events: SQL Server uses SQL Agent jobs\n`;
        break;
    }
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Open SQL Editor with DDL: SHOW CREATE TABLE/PROCEDURE/VIEW/FUNCTION/TRIGGER/EVENT. */
  const openObjectDdl = (
    serverId: string,
    dbName: string,
    kind: 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event',
    objectName: string
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedName = escapeIdentifier(objectName, dbType);
    let sql = '';
    if (dbType === 'mssql') {
      switch (kind) {
        case 'table':
          sql = `-- Table DDL: use SSMS or SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${objectName.replace(/'/g, "''")}';\n`;
          break;
        case 'view':
        case 'procedure':
        case 'function':
          sql = `SELECT OBJECT_DEFINITION(OBJECT_ID('${dbName}.dbo.${objectName.replace(/'/g, "''")}'));\n`;
          break;
        default:
          sql = `-- ${kind} structure: use Object Explorer in MSSQL\n`;
      }
    } else {
      switch (kind) {
        case 'table':
          sql = `SHOW CREATE TABLE ${escapedDb}.${escapedName};\n`;
          break;
        case 'view':
          sql = `SHOW CREATE VIEW ${escapedDb}.${escapedName};\n`;
          break;
        case 'procedure':
          sql = `SHOW CREATE PROCEDURE ${escapedDb}.${escapedName};\n`;
          break;
        case 'function':
          sql = `SHOW CREATE FUNCTION ${escapedDb}.${escapedName};\n`;
          break;
        case 'trigger':
          sql = `SHOW CREATE TRIGGER ${escapedDb}.${escapedName};\n`;
          break;
        case 'event':
          sql = `SHOW CREATE EVENT ${escapedDb}.${escapedName};\n`;
          break;
      }
    }
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  const refreshDatabaseSchema = async (serverId: string, dbName: string) => {
    const key = `${serverId}:${dbName}`;
    setRefreshingSchemaKey(key);
    try {
      await loadDatabaseSchema(serverId, dbName);
    } finally {
      setRefreshingSchemaKey((prev) => (prev === key ? null : prev));
    }
  };

  /** Schema level: open Backup screen with this server/database selected. */
  const openBackupSchema = (serverId: string, dbName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    setActiveTab('backup');
    navigate('/backup');
  };

  /** Schema level: open Restore screen with this server/database selected. */
  const openRestoreSchema = (serverId: string, dbName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    setActiveTab('restore');
    navigate('/restore');
  };

  /** Object level (table/procedure/view etc): open Import wizard with this server/database/object context. */
  const openImportForObject = (
    serverId: string,
    dbName: string,
    _kind: 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event',
    _objectName: string
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    setActiveTab('import-wizard');
    navigate('/import-wizard');
  };

  /** Object level (table/procedure/view etc): open Export wizard with this server/database/object context. */
  const openExportForObject = (
    serverId: string,
    dbName: string,
    _kind: 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event',
    _objectName: string
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    setActiveTab('export-wizard');
    navigate('/export-wizard');
  };

  /** Table only: open SQL Editor with CREATE TABLE template (new table in same DB). */
  const openTableCreate = (serverId: string, dbName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedTable = escapeIdentifier('new_table', dbType);
    const sql = dbType === 'mssql'
      ? `CREATE TABLE ${escapedDb}.dbo.${escapedTable} (\n  id INT IDENTITY(1,1) PRIMARY KEY\n);\n`
      : `CREATE TABLE ${escapedDb}.${escapedTable} (\n  id INT PRIMARY KEY AUTO_INCREMENT\n);\n`;
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Table only: open SQL Editor with SHOW CREATE TABLE to view full table structure. */
  const openTableUpdate = (serverId: string, dbName: string, tableName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedName = escapeIdentifier(tableName, dbType);
    const sql = dbType === 'mssql'
      ? `-- Table structure: use INFORMATION_SCHEMA or SSMS script\nSELECT * FROM ${escapedDb}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName.replace(/'/g, "''")}';\n`
      : `-- Table structure: run to get the full CREATE TABLE definition\nSHOW CREATE TABLE ${escapedDb}.${escapedName};\n`;
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Run SHOW CREATE and show the CREATE statement directly in a dialog. */
  const DDL_COLUMN_NAMES: Record<string, string> = {
    table: 'Create Table',
    view: 'Create View',
    procedure: 'Create Procedure',
    function: 'Create Function',
    trigger: 'Create Trigger',
    event: 'Create Event',
  };
  const fetchAndShowDdl = async (
    serverId: string,
    dbName: string,
    kind: 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event',
    objectName: string
  ) => {
    const server = getServerById(serverId);
    if (!server) return;
    const dbType = server.databaseType;
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedName = escapeIdentifier(objectName, dbType);
    let query = '';
    if (dbType === 'mssql') {
      switch (kind) {
        case 'view':
        case 'procedure':
        case 'function':
          query = `SELECT OBJECT_DEFINITION(OBJECT_ID('${dbName}.dbo.${objectName.replace(/'/g, "''")}'))`;
          break;
        default:
          query = `SELECT 'MSSQL: use Object Explorer to script ${kind}' AS info`;
      }
    } else {
      switch (kind) {
        case 'table': query = `SHOW CREATE TABLE ${escapedDb}.${escapedName}`; break;
        case 'view': query = `SHOW CREATE VIEW ${escapedDb}.${escapedName}`; break;
        case 'procedure': query = `SHOW CREATE PROCEDURE ${escapedDb}.${escapedName}`; break;
        case 'function': query = `SHOW CREATE FUNCTION ${escapedDb}.${escapedName}`; break;
        case 'trigger': query = `SHOW CREATE TRIGGER ${escapedDb}.${escapedName}`; break;
        case 'event': query = `SHOW CREATE EVENT ${escapedDb}.${escapedName}`; break;
      }
    }
    setDdlDialogTitle(`${kind}: ${objectName}`);
    setDdlDialogContent('');
    setDdlDialogOpen(true);
    setDdlDialogLoading(true);
    try {
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database: dbName,
        type: server.databaseType,
        query,
      });
      if (!result.success || !result.rows?.length) {
        setDdlDialogContent(result.error || 'No result returned.');
        return;
      }
      const row = result.rows[0];
      const colName = DDL_COLUMN_NAMES[kind];
      let ddl = '';
      if (dbType === 'mssql' && result.columns?.length) {
        const firstCol = result.columns[0];
        const val = Array.isArray(row) ? row[0] : (row as Record<string, unknown>)[firstCol];
        ddl = val != null ? String(val) : (result.columns.length > 1 ? String((row as Record<string, unknown>)[result.columns[1]]) : '—');
      } else if (Array.isArray(row) && result.columns?.length) {
        const idx = result.columns.findIndex((c: string) => c === colName);
        ddl = idx >= 0 ? String(row[idx] ?? '') : String(row[row.length - 1] ?? '');
      } else if (row && typeof row === 'object' && colName in row) {
        ddl = String((row as Record<string, unknown>)[colName] ?? '');
      } else {
        ddl = String((row as Record<string, unknown>)[colName] ?? (row as Record<string, unknown>)['Create Table'] ?? (row as Record<string, unknown>)['Create View'] ?? JSON.stringify(row));
      }
      setDdlDialogContent(ddl || '—');
    } catch (e) {
      setDdlDialogContent(String(e));
    } finally {
      setDdlDialogLoading(false);
    }
  };

  /** Defer action so dropdown can close first and navigation/state updates run after. */
  const deferAction = useCallback((fn: () => void) => {
    setTimeout(fn, 0);
  }, []);

  /** Open Data Editor with this table and show its data directly. */
  const openTableViewData = (serverId: string, dbName: string, tableName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    setSelectedTableName(tableName);
    setActiveTab('data-editor');
    navigate('/data-editor');
  };

  /** Table only: open SQL Editor with DROP TABLE (with confirmation hint). */
  const openTableDelete = (serverId: string, dbName: string, tableName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const escapedName = escapeIdentifier(tableName, dbType);
    const sql = dbType === 'mssql'
      ? `-- WARNING: This will permanently delete the table and its data.\nDROP TABLE ${escapedDb}.dbo.${escapedName};\n`
      : `-- WARNING: This will permanently delete the table and its data.\nDROP TABLE ${escapedDb}.${escapedName};\n`;
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Schema: open SQL Editor with CREATE DATABASE (new schema). */
  const openSchemaCreate = (serverId: string) => {
    selectServer(serverId);
    selectDatabase(null);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedName = escapeIdentifier('new_database', dbType);
    const sql = dbType === 'mssql'
      ? `-- Create a new database\nCREATE DATABASE ${escapedName};\n`
      : `-- Create a new database (schema)\nCREATE DATABASE ${escapedName};\nUSE ${escapedName};\n`;
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Schema: View DDL (Read). Loads schema if needed, then opens DDL script. */
  const openSchemaRead = async (
    serverId: string,
    dbName: string,
    currentSchema: { tables?: { name: string }[]; procedures?: { name: string }[]; views?: { name: string }[]; functions?: { name: string }[]; triggers?: { name: string }[] } | undefined
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    if (!currentSchema) await loadDatabaseSchema(serverId, dbName);
    const schema = currentSchema ?? (useBackupStore.getState().databaseSchemas[serverId] ?? []).find((s) => s.name === dbName);
    openSchemaDdl(serverId, dbName, schema);
  };

  /** Schema: open SQL Editor with DROP DATABASE (Delete). */
  const openSchemaDelete = (serverId: string, dbName: string) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const sql = `-- WARNING: This will permanently delete the database and all its objects.\nDROP DATABASE ${escapedDb};\n`;
    setSqlEditorInitialSql(sql);
    setActiveTab('sql-editor');
  };

  /** Schema level: open SQL Editor with DDL script (SHOW CREATE for all tables, procedures, views, functions, triggers). */
  const openSchemaDdl = (
    serverId: string,
    dbName: string,
    schema: { tables?: { name: string }[]; procedures?: { name: string }[]; views?: { name: string }[]; functions?: { name: string }[]; triggers?: { name: string }[] } | undefined
  ) => {
    selectServer(serverId);
    selectDatabase(dbName);
    const server = getServerById(serverId);
    const dbType = server?.databaseType ?? 'mysql';
    const escapedDb = escapeIdentifier(dbName, dbType);
    const lines: string[] = [`-- Schema DDL: ${dbName}`, `USE ${escapedDb};`, ''];
    const esc = (name: string) => escapeIdentifier(name, dbType);
    if (dbType === 'mssql') {
      if (schema?.tables?.length) {
        lines.push('-- Tables (column list)');
        schema.tables.forEach((t) => {
          lines.push(`SELECT * FROM ${escapedDb}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${t.name.replace(/'/g, "''")}';`, '');
        });
      }
      if (schema?.views?.length || schema?.procedures?.length || schema?.functions?.length) {
        lines.push('-- Views / Procedures / Functions (OBJECT_DEFINITION)');
        [...(schema?.views ?? []), ...(schema?.procedures ?? []), ...(schema?.functions ?? [])].forEach((obj) => {
          lines.push(`SELECT OBJECT_DEFINITION(OBJECT_ID('${dbName}.dbo.${obj.name.replace(/'/g, "''")}'));`, '');
        });
      }
    } else {
      if (schema?.tables?.length) {
        lines.push('-- Tables');
        schema.tables.forEach((t) => {
          lines.push(`SHOW CREATE TABLE ${escapedDb}.${esc(t.name)};`, '');
        });
      }
      if (schema?.procedures?.length) {
        lines.push('-- Procedures');
        schema.procedures.forEach((p) => {
          lines.push(`SHOW CREATE PROCEDURE ${escapedDb}.${esc(p.name)};`, '');
        });
      }
      if (schema?.views?.length) {
        lines.push('-- Views');
        schema.views.forEach((v) => {
          lines.push(`SHOW CREATE VIEW ${escapedDb}.${esc(v.name)};`, '');
        });
      }
      if (schema?.functions?.length) {
        lines.push('-- Functions');
        schema.functions.forEach((f) => {
          lines.push(`SHOW CREATE FUNCTION ${escapedDb}.${esc(f.name)};`, '');
        });
      }
      if (schema?.triggers?.length) {
        lines.push('-- Triggers');
        schema.triggers.forEach((t) => {
          lines.push(`SHOW CREATE TRIGGER ${escapedDb}.${esc(t.name)};`, '');
        });
      }
    }
    if (lines.length <= 3) lines.push('-- No objects loaded. Expand this schema and use Refresh, then try again.');
    setSqlEditorInitialSql(lines.join('\n'));
    setActiveTab('sql-editor');
  };

  const filterNorm = schemaFilter.trim().toLowerCase();
  /** Only apply filter when user has typed at least 3 characters. */
  const MIN_FILTER_LENGTH = 3;
  const filterActive = filterNorm.length >= MIN_FILTER_LENGTH;

  /** Match if name contains the filter text (any 3+ letter substring in table/procedure/view/trigger/function/event names). */
  const matchesFilter = (name: string | null | undefined): boolean => {
    if (!filterActive) return true;
    if (name == null || typeof name !== 'string') return false;
    return name.toLowerCase().includes(filterNorm);
  };

  /** When filter is active, highlight the matching substring in the name. */
  const highlightMatch = (name: string) => {
    if (!filterActive || !name) return name;
    const lower = name.toLowerCase();
    const idx = lower.indexOf(filterNorm);
    if (idx === -1) return name;
    const end = idx + filterNorm.length;
    return (
      <>
        {name.slice(0, idx)}
        <mark className="bg-primary/25 text-foreground rounded px-0.5 font-medium">{name.slice(idx, end)}</mark>
        {name.slice(end)}
      </>
    );
  };

  if (isMinimized) {
    return (
      <aside
        className="shrink-0 border-r border-border bg-background flex flex-col items-center py-2"
        style={{ width: MINIMIZED_WIDTH }}
        role="tree"
        aria-label="Database Explorer"
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Expand panel"
          onClick={toggleMinimize}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="shrink-0 border-r border-border bg-background flex flex-col relative"
      style={{ width: panelWidth }}
      role="tree"
      aria-label="Database Explorer"
    >
      <div className="p-2 border-b border-border flex items-center justify-between gap-1">
        <span
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate min-w-0"
          aria-label="Database Explorer"
        >
          Database Explorer
        </span>
        <div className="flex items-center shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label="Maximize panel"
            onClick={setMaximized}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label="Minimize panel"
            onClick={toggleMinimize}
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div
        ref={resizeRef}
        className="absolute top-0 -right-0.5 w-3 h-full cursor-col-resize z-20 flex items-center justify-center group hover:bg-muted/50 active:bg-muted transition-colors"
        aria-label="Drag to resize panel horizontally"
        title="Drag to resize Database Explorer panel"
      >
        <div className="w-0.5 h-full min-h-[80px] bg-border group-hover:bg-primary group-active:bg-primary/90 transition-colors rounded-full pointer-events-none" />
      </div>

      <ScrollArea className="flex-1">
        <nav className="py-2 pr-2">
          <div className="px-2 pb-2 space-y-1">
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search objects (3+ letters): tables, views, procedures…"
                value={schemaFilter}
                onChange={(e) => setSchemaFilter(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs font-mono placeholder:text-muted-foreground"
                aria-label="Filter schema, tables, views, procedures, functions, triggers, events"
              />
              {schemaFilter.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Clear filter"
                  onClick={() => setSchemaFilter('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {filterNorm.length > 0 && (
              <p className="text-[10px] text-muted-foreground px-1">
                {filterNorm.length < MIN_FILTER_LENGTH
                  ? `Type ${MIN_FILTER_LENGTH} or more letters to filter`
                  : <>Matches tables, views, procedures, functions, triggers, events: <span className="font-mono text-foreground">&quot;{schemaFilter.trim()}&quot;</span></>}
              </p>
            )}
          </div>
          {servers.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              <p className="font-medium text-foreground mb-1">No connections</p>
              <p className="mb-2">Add a server to browse databases.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAddServerFromContext?.() ?? onAddServerClick?.() ?? setActiveTab('servers');
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add server
              </Button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {servers.map((server) => {
                const isServerExpanded = expandedServers.has(server.id);
                const databases = getDatabasesForServer(server.id);

                return (
                  <li key={server.id} className="rounded-md">
                    <div
                      className={cn(
                        'flex items-center gap-0.5 w-full rounded-md',
                        selectedServerId === server.id && 'bg-primary/10'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleServer(server.id)}
                        className={cn(
                          'flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left text-sm rounded-md min-w-0',
                          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                          selectedServerId === server.id && 'text-primary'
                        )}
                      >
                        {isServerExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        {server.connectionStatus === 'connected' ? (
                          <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : server.connectionStatus === 'testing' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate font-medium">{server.name}</span>
                      </button>
                    </div>

                    {isServerExpanded && (
                      <ul className="ml-4 mt-0.5 border-l border-border pl-1 space-y-0.5">
                        {(() => {
                          const matchingDbs = databases.filter((db) => {
                            if (matchesFilter(db.name)) return true;
                            const fullSchema = databaseSchemas[server.id]?.find((s) => s.name === db.name);
                            if (!fullSchema) return true;
                            const objects = [
                              ...(fullSchema.tables ?? []),
                              ...(fullSchema.views ?? []),
                              ...(fullSchema.procedures ?? []),
                              ...(fullSchema.functions ?? []),
                              ...(fullSchema.triggers ?? []),
                              ...(fullSchema.events ?? []),
                            ];
                            return objects.some((obj) => matchesFilter(obj.name));
                          });
                          if (filterActive && matchingDbs.length === 0) {
                            return (
                              <li key="no-match" className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                                No match in schema, tables, views, procedures, functions, triggers, or events for &quot;{schemaFilter.trim()}&quot;
                              </li>
                            );
                          }
                          return matchingDbs.map((db) => {
                          const key = `${server.id}:${db.name}`;
                          const isDbExpanded = expandedDatabases.has(key);
                          const fullSchema = databaseSchemas[server.id]?.find((s) => s.name === db.name);

                          return (
                            <li key={db.name}>
                              <div
                                className={cn(
                                  'w-full flex items-center gap-0.5 px-2 py-1.5 text-left text-sm rounded-md group',
                                  'hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset',
                                  selectedServerId === server.id && selectedDatabaseName === db.name && 'bg-primary/10 text-primary'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDatabase(server.id, db.name);
                                  }}
                                  className="shrink-0 p-0.5 rounded hover:bg-muted"
                                  aria-label={isDbExpanded ? 'Collapse' : 'Expand'}
                                >
                                  <ChevronRight
                                    className={cn(
                                      'h-4 w-4 text-muted-foreground transition-transform',
                                      isDbExpanded && 'rotate-90'
                                    )}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    selectServer(server.id);
                                    selectDatabase(db.name);
                                    if (!isDbExpanded) {
                                      setExpandedDatabases((p) => new Set(p).add(key));
                                      await loadDatabaseSchema(server.id, db.name);
                                      setExpandedObjectCategories((prev) => {
                                        const nextCat = new Set(prev);
                                        OBJECT_CATEGORIES.forEach((cat) =>
                                          nextCat.add(objectCategoryKey(server.id, db.name, cat))
                                        );
                                        return nextCat;
                                      });
                                    }
                                  }}
                                  className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                                >
                                  <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate font-mono text-xs">{highlightMatch(db.name)}</span>
                                  {db.tableCount != null && db.tableCount > 0 && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">{db.tableCount}</span>
                                  )}
                                </button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'h-6 w-6 p-0 shrink-0 hover:bg-muted/50 opacity-70 group-hover:opacity-100',
                                    refreshingSchemaKey === key && 'opacity-100'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    refreshDatabaseSchema(server.id, db.name);
                                  }}
                                  disabled={refreshingSchemaKey === key}
                                  aria-label={`Refresh schema ${db.name}`}
                                  title="Refresh schema"
                                >
                                  {refreshingSchemaKey === key ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 shrink-0 hover:bg-muted/50 opacity-70 group-hover:opacity-100"
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Actions for schema ${db.name}`}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent side="top" align="end" className="min-w-[200px]">
                                    <DropdownMenuItem onSelect={() => deferAction(() => openTableCreate(server.id, db.name))}>
                                      <Plus className="h-3.5 w-3.5 mr-2" />
                                      Create table
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => deferAction(() => openSchemaRead(server.id, db.name, fullSchema))}>
                                      <Eye className="h-3.5 w-3.5 mr-2" />
                                      View schema DDL
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => deferAction(() => refreshDatabaseSchema(server.id, db.name))}>
                                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                      Refresh schema
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => deferAction(() => openSchemaDelete(server.id, db.name))}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Drop database
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => deferAction(() => openBackupSchema(server.id, db.name))}>
                                      <Archive className="h-3.5 w-3.5 mr-2" />
                                      Backup schema
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => deferAction(() => openRestoreSchema(server.id, db.name))}>
                                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                                      Restore schema
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {isDbExpanded && !fullSchema && (
                                <ul className="ml-4 mt-0.5 border-l border-border pl-1 space-y-0.5 text-xs">
                                  {[
                                    { key: 'tables', label: 'Tables', icon: Table2 },
                                    { key: 'views', label: 'Views', icon: Eye },
                                    { key: 'procedures', label: 'Procedures', icon: FileCode },
                                    { key: 'functions', label: 'Functions', icon: FunctionSquare },
                                    { key: 'triggers', label: 'Triggers', icon: Zap },
                                    { key: 'events', label: 'Events', icon: Calendar },
                                  ].map(({ key, label, icon: Icon }) => (
                                    <li key={key} className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
                                      <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                                      <Icon className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{label}</span>
                                      <Loader2 className="h-3 w-3 animate-spin shrink-0 ml-0.5" />
                                      <span className="text-[10px] italic">Loading…</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {isDbExpanded && fullSchema && (
                                <>
                                  <ul className="ml-4 mt-0.5 border-l border-border pl-1 space-y-0.5 text-xs">
                                  {[
                                    {
                                      key: 'tables',
                                      label: 'Tables',
                                      icon: Table2,
                                      items: fullSchema.tables ?? [],
                                      getLabel: (t: { name: string }) => t.name,
                                    },
                                    {
                                      key: 'views',
                                      label: 'Views',
                                      icon: Eye,
                                      items: fullSchema.views ?? [],
                                      getLabel: (v: { name: string }) => v.name,
                                    },
                                    {
                                      key: 'procedures',
                                      label: 'Procedures',
                                      icon: FileCode,
                                      items: fullSchema.procedures ?? [],
                                      getLabel: (p: { name: string }) => p.name,
                                    },
                                    {
                                      key: 'functions',
                                      label: 'Functions',
                                      icon: FunctionSquare,
                                      items: fullSchema.functions ?? [],
                                      getLabel: (f: { name: string }) => f.name,
                                    },
                                    {
                                      key: 'triggers',
                                      label: 'Triggers',
                                      icon: Zap,
                                      items: fullSchema.triggers ?? [],
                                      getLabel: (t: { name: string }) => t.name,
                                    },
                                    {
                                      key: 'events',
                                      label: 'Events',
                                      icon: Calendar,
                                      items: fullSchema.events ?? [],
                                      getLabel: (e: { name: string }) => e.name,
                                    },
                                  ].map(({ key, label, icon: Icon, items, getLabel }) => {
                                    const catKey = objectCategoryKey(server.id, db.name, key);
                                    const isCatExpanded = expandedObjectCategories.has(catKey);
                                    const kind = key.slice(0, -1) as 'table' | 'view' | 'procedure' | 'function' | 'trigger' | 'event';
                                    const filteredItems = filterActive
                                      ? items.filter((obj) => {
                                          const label = getLabel(obj);
                                          return label != null && matchesFilter(label);
                                        })
                                      : items;
                                    return (
                                      <li key={key}>
                                        <div className="flex items-center gap-0.5 w-full group">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleObjectCategory(server.id, db.name, key);
                                            }}
                                            className="flex-1 flex items-center gap-1.5 min-w-0 px-2 py-1 rounded hover:bg-muted/50 text-left text-muted-foreground hover:text-foreground"
                                          >
                                            {isCatExpanded ? (
                                              <ChevronDown className="h-3 w-3 shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 shrink-0" />
                                            )}
                                            <Icon className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{label} ({filteredItems.length})</span>
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 shrink-0 hover:bg-muted/50 opacity-70 group-hover:opacity-100"
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label={`Actions for ${label}`}
                                              >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent side="top" align="end" className="min-w-[200px]">
                                              <DropdownMenuItem onSelect={() => deferAction(() => refreshDatabaseSchema(server.id, db.name))}>
                                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                                Refresh schema
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onSelect={() => deferAction(() => openSchemaRead(server.id, db.name, fullSchema))}>
                                                <Eye className="h-3.5 w-3.5 mr-2" />
                                                View schema DDL
                                              </DropdownMenuItem>
                                              {key === 'tables' && (
                                                <>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onSelect={() => deferAction(() => openTableCreate(server.id, db.name))}>
                                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                                    Create table
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onSelect={() => deferAction(() => openSchemaDelete(server.id, db.name))}
                                                    className="text-red-600 focus:text-red-600"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Drop database
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onSelect={() => deferAction(() => openBackupSchema(server.id, db.name))}>
                                                    <Archive className="h-3.5 w-3.5 mr-2" />
                                                    Backup schema
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onSelect={() => deferAction(() => openRestoreSchema(server.id, db.name))}>
                                                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                                                    Restore schema
                                                  </DropdownMenuItem>
                                                </>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                        {isCatExpanded && filteredItems.length > 0 && (
                                          <ul className="ml-4 mt-0.5 border-l border-border pl-1 space-y-0.5">
                                            {filteredItems.map((obj) => {
                                              const label = getLabel(obj);
                                              return (
                                                <li key={label}>
                                                  <div className="flex items-center gap-0.5 w-full group">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (kind === 'table') {
                                                          setSelectedTableName(label ?? null);
                                                          openTableViewData(server.id, db.name, label ?? '');
                                                        } else {
                                                          openObjectDml(server.id, db.name, kind, label);
                                                        }
                                                      }}
                                                      className={cn(
                                                        'flex-1 flex items-center gap-1.5 min-w-0 px-2 py-1 rounded hover:bg-muted/50 text-left font-mono text-[11px] truncate',
                                                        kind === 'table' && selectedTableName === label && 'bg-primary/10 text-primary'
                                                      )}
                                                      title={kind === 'table' ? `${label} — View table data` : `${label} — Open in SQL Editor`}
                                                    >
                                                      <span className="truncate">{highlightMatch(label)}</span>
                                                    </button>
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 w-6 p-0 shrink-0 hover:bg-muted/50 opacity-70 group-hover:opacity-100"
                                                          onClick={(e) => e.stopPropagation()}
                                                          aria-label={`Actions for ${kind} ${label}`}
                                                        >
                                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent side="top" align="end" className="min-w-[200px]">
                                                        {kind === 'table' && (
                                                          <>
                                                            <DropdownMenuItem
                                                              onSelect={() => deferAction(() => openTableCreate(server.id, db.name))}
                                                            >
                                                              <Plus className="h-3.5 w-3.5 mr-2" />
                                                              Create table
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                              onSelect={() => deferAction(() => openTableViewData(server.id, db.name, label ?? ''))}
                                                            >
                                                              <Eye className="h-3.5 w-3.5 mr-2" />
                                                              View data
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                              onSelect={() => deferAction(() => fetchAndShowDdl(server.id, db.name, 'table', label ?? ''))}
                                                            >
                                                              <FileCode className="h-3.5 w-3.5 mr-2" />
                                                              View table structure
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                              onSelect={() => deferAction(() => openTableDelete(server.id, db.name, label ?? ''))}
                                                              className="text-red-600 focus:text-red-600"
                                                            >
                                                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                              Drop table
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                          </>
                                                        )}
                                                        <DropdownMenuItem
                                                          onSelect={() => deferAction(() => openImportForObject(server.id, db.name, kind, label ?? ''))}
                                                        >
                                                          <Upload className="h-3.5 w-3.5 mr-2" />
                                                          Import data
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onSelect={() => deferAction(() => openExportForObject(server.id, db.name, kind, label ?? ''))}
                                                        >
                                                          <Download className="h-3.5 w-3.5 mr-2" />
                                                          Export data
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onSelect={() => deferAction(() => openObjectDml(server.id, db.name, kind, label ?? ''))}
                                                        >
                                                          <Database className="h-3.5 w-3.5 mr-2" />
                                                          Open in SQL Editor (SELECT / CALL)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onSelect={() => deferAction(() => fetchAndShowDdl(server.id, db.name, kind, label ?? ''))}
                                                        >
                                                          <FileCode className="h-3.5 w-3.5 mr-2" />
                                                          View structure (SHOW CREATE)
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                        {isCatExpanded && filteredItems.length === 0 && (
                                          <p className="ml-4 px-2 py-1 text-[10px] text-muted-foreground italic">
                                            {filterNorm ? 'No matches' : `No ${label.toLowerCase()}`}
                                          </p>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                                </>
                              )}
                            </li>
                          );
                        });
                        })()}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </ScrollArea>

      {/* Object Info / Session panel (Workbench-style); collapsed by default, expand when needed */}
      <div className="border-t border-border flex flex-col min-h-0 shrink-0" style={objectInfoPanelCollapsed ? undefined : { maxHeight: 280 }}>
        <button
          type="button"
          onClick={() => setObjectInfoPanelCollapsed((c) => !c)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border-b border-border shrink-0"
          aria-expanded={!objectInfoPanelCollapsed}
        >
          <span>Object Info / Session</span>
          {objectInfoPanelCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        {!objectInfoPanelCollapsed && (
          <>
            <div className="flex border-b border-border shrink-0">
              <button
                type="button"
                onClick={() => setObjectInfoTab('object-info')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium',
                  objectInfoTab === 'object-info'
                    ? 'bg-muted border-b-2 border-primary text-foreground -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Object Info
              </button>
              <button
                type="button"
                onClick={() => setObjectInfoTab('session')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium',
                  objectInfoTab === 'session'
                    ? 'bg-muted border-b-2 border-primary text-foreground -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Session
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0 p-2">
              {objectInfoTab === 'object-info' && selectedServerId && selectedDatabaseName && selectedTableName && (() => {
                const schemas = databaseSchemas[selectedServerId];
                const schema = schemas?.find((s) => s.name === selectedDatabaseName);
                const table = schema?.tables?.find((t) => t.name === selectedTableName);
                if (!table) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Table &quot;{selectedTableName}&quot; — select a table from the tree or refresh schema.
                    </p>
                  );
                }
                return (
                  <div className="text-xs space-y-2">
                    <p className="font-medium text-foreground">Table: {table.name}</p>
                    <p className="text-muted-foreground uppercase tracking-wider">Columns</p>
                    <ul className="space-y-0.5 font-mono">
                      {(table.columns ?? []).map((col) => {
                        const constraints: string[] = [];
                        if (col.isPrimaryKey) constraints.push('PK');
                        if (col.isForeignKey) constraints.push('FK');
                        if (col.isUnique && !col.isPrimaryKey) constraints.push('UQ');
                        if (!col.nullable) constraints.push('NN');
                        const typeStr = col.dataType + (col.maxLength != null ? `(${col.maxLength})` : '');
                        return (
                          <li key={col.name} className="flex justify-between gap-2 truncate">
                            <span className="truncate">{col.name}</span>
                            <span className="text-muted-foreground shrink-0">{typeStr} {constraints.length ? constraints.join(' ') : ''}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
              {objectInfoTab === 'object-info' && (!selectedTableName || !selectedServerId || !selectedDatabaseName) && (
                <p className="text-xs text-muted-foreground">Select a table in the schema tree to view column info.</p>
              )}
              {objectInfoTab === 'session' && (
                <p className="text-xs text-muted-foreground">Session details (connection, user) can be shown here.</p>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {/* DDL dialog: shows CREATE TABLE / CREATE VIEW / etc. directly */}
      <Dialog open={ddlDialogOpen} onOpenChange={setDdlDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{ddlDialogTitle || 'CREATE statement'}</DialogTitle>
          </DialogHeader>
          {ddlDialogLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : (
            <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">{ddlDialogContent || '—'}</pre>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
