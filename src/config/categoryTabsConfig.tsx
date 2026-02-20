/**
 * dbForge-style category tabs and Administration dashboard cards.
 * Maps category tab id to title and list of action cards (screenId, title, description, icon).
 */

import type { LucideIcon } from 'lucide-react';
import type { ScreenId } from './navigationConfig';
import {
  FileText,
  Database,
  Layout,
  RefreshCw,
  BarChart3,
  HardDrive,
  BarChart2,
  Users,
  Search,
  Server,
  DatabaseIcon,
  RefreshCwIcon,
  Copy,
  Table2,
  Code2,
  GitCompare,
  Truck,
  FileOutput,
  FlaskConical,
  LineChart,
  ShieldCheck,
  WrenchIcon,
  Activity,
  FileSearch,
  Upload,
  Download,
  Zap,
  PieChart,
  Clock,
  FileCode,
  RotateCcwIcon,
  History,
  FolderOpen,
} from 'lucide-react';

export type CategoryTabId =
  | 'start'
  | 'sql-development'
  | 'database-design'
  | 'database-sync'
  | 'administration'
  | 'data-pump'
  | 'data-analysis';

export interface CategoryCard {
  screenId: ScreenId;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface CategoryTabConfig {
  id: CategoryTabId;
  label: string;
  cards: CategoryCard[];
}

export const CATEGORY_TABS: CategoryTabConfig[] = [
  {
    id: 'start',
    label: 'Start Page',
    cards: [
      { screenId: 'backup', title: 'Backup Database', description: 'Create a new backup.', icon: HardDrive },
      { screenId: 'restore', title: 'Restore Database', description: 'Restore from a backup file.', icon: RotateCcwIcon },
      { screenId: 'sql-editor', title: 'New SQL', description: 'Open a new SQL document.', icon: FileText },
      { screenId: 'servers', title: 'Manage Servers', description: 'Add or edit connections.', icon: Server },
      { screenId: 'history', title: 'Backup History', description: 'View backup and restore history.', icon: History },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    cards: [
      {
        screenId: 'security-manager',
        title: 'Manage Server Security',
        description: 'Setup user accounts and permissions.',
        icon: Users,
      },
      {
        screenId: 'monitoring',
        title: 'Monitor Sessions',
        description: 'Track open sessions and user activity.',
        icon: BarChart2,
      },
      {
        screenId: 'backup',
        title: 'Backup Database…',
        description: 'Create a database backup file.',
        icon: HardDrive,
      },
      {
        screenId: 'maintenance',
        title: 'Perform Table Maintenance…',
        description: 'Check, optimize, and repair tables.',
        icon: WrenchIcon,
      },
      {
        screenId: 'database-objects',
        title: 'Find Invalid Objects…',
        description: 'Find invalid objects in databases.',
        icon: Search,
      },
      {
        screenId: 'servers',
        title: 'Start/Stop MySQL Server',
        description: 'Control MySQL service instances in one place.',
        icon: Server,
      },
      {
        screenId: 'settings',
        title: 'View Server Variables',
        description: 'View and edit MySQL server variables.',
        icon: DatabaseIcon,
      },
      {
        screenId: 'restore',
        title: 'Restore Database…',
        description: 'Restore a database from a backup file.',
        icon: RotateCcwIcon,
      },
      {
        screenId: 'compare',
        title: 'Flush Objects…',
        description: 'Flush tables, locks, query cache, etc.',
        icon: RefreshCwIcon,
      },
      {
        screenId: 'data-compare',
        title: 'Copy Databases',
        description: 'Copy a set of databases by generating and running a script.',
        icon: Copy,
      },
    ],
  },
  {
    id: 'sql-development',
    label: 'SQL Development',
    cards: [
      { screenId: 'sql-editor', title: 'New SQL', description: 'Open a new SQL document.', icon: FileText },
      { screenId: 'query-builder', title: 'Query Builder', description: 'Visual query builder.', icon: Table2 },
      { screenId: 'procedure-debugger', title: 'Procedure Debugger', description: 'Debug stored procedures.', icon: Code2 },
      { screenId: 'code-snippets-library', title: 'Code Snippets', description: 'Reusable SQL snippets.', icon: FileCode },
      { screenId: 'sql-formatter', title: 'SQL Formatter', description: 'Format and beautify SQL.', icon: FileText },
      { screenId: 'execution-plan-viewer', title: 'Execution Plan', description: 'Visual execution plan.', icon: BarChart3 },
      { screenId: 'profiler', title: 'Profiler', description: 'Trace SQL execution.', icon: Activity },
      { screenId: 'slow-query-analyzer', title: 'Slow Query Analyzer', description: 'Top N slow queries.', icon: Clock },
      { screenId: 'query-history-favorites', title: 'Query History & Favorites', description: 'Saved queries.', icon: FileSearch },
    ],
  },
  {
    id: 'database-design',
    label: 'Database Design',
    cards: [
      { screenId: 'er-diagram', title: 'ER Diagram', description: 'Entity-relationship diagram.', icon: Layout },
      { screenId: 'database-objects', title: 'Database Objects', description: 'Tables, views, procedures.', icon: Database },
      { screenId: 'table-designer', title: 'Table Designer', description: 'Visual table designer.', icon: Table2 },
      { screenId: 'object-scripting', title: 'Object Scripting', description: 'Generate CREATE/ALTER scripts.', icon: FileOutput },
      { screenId: 'schema-documenter', title: 'Schema Documenter', description: 'Generate documentation.', icon: FileText },
      { screenId: 'index-manager', title: 'Index Manager', description: 'Create and manage indexes.', icon: Database },
    ],
  },
  {
    id: 'database-sync',
    label: 'Database Sync',
    cards: [
      { screenId: 'compare', title: 'Schema Compare', description: 'Compare database schemas.', icon: GitCompare },
      { screenId: 'data-compare', title: 'Data Compare', description: 'Compare table data.', icon: Table2 },
      { screenId: 'sync-wizard', title: 'Sync Wizard', description: 'Bidirectional sync.', icon: RefreshCw },
      { screenId: 'migration-wizard', title: 'Migration Wizard', description: 'Migrate database or subset.', icon: Truck },
      { screenId: 'drift-detection', title: 'Drift Detection', description: 'Scheduled drift checks.', icon: Activity },
    ],
  },
  {
    id: 'data-pump',
    label: 'Data Pump',
    cards: [
      { screenId: 'export-wizard', title: 'Export Wizard', description: 'Export to CSV, Excel, JSON.', icon: Download },
      { screenId: 'import-wizard', title: 'Import Wizard', description: 'Import from file.', icon: Upload },
      { screenId: 'data-generator', title: 'Data Generator', description: 'Generate test data.', icon: FlaskConical },
      { screenId: 'data-pump', title: 'Data Pump / Bulk Load', description: 'High-speed bulk load.', icon: Zap },
    ],
  },
  {
    id: 'data-analysis',
    label: 'Data Analysis',
    cards: [
      { screenId: 'data-quality-rules', title: 'Data Quality Rules', description: 'Validation and integrity.', icon: ShieldCheck },
      { screenId: 'data-lineage', title: 'Data Lineage', description: 'Trace data flow.', icon: LineChart },
      { screenId: 'pivot-table-view', title: 'Pivot Table View', description: 'Pivot query results.', icon: PieChart },
      { screenId: 'chart-visualization', title: 'Chart / Visualization', description: 'Charts from query results.', icon: BarChart3 },
    ],
  },
];

export const DEFAULT_CATEGORY_TAB_ID: CategoryTabId = 'start';

/** Default screen when user clicks a category tab (first card or start screen). */
export const CATEGORY_DEFAULT_SCREEN: Record<CategoryTabId, ScreenId> = {
  start: 'start',
  administration: 'monitoring',
  'sql-development': 'sql-editor',
  'database-design': 'er-diagram',
  'database-sync': 'compare',
  'data-pump': 'export-wizard',
  'data-analysis': 'data-quality-rules',
};

/** Map screenId → categoryTabId (from cards; first occurrence wins). Unmapped screens → start. */
const screenToCategoryMap = new Map<ScreenId, CategoryTabId>();
for (const tab of CATEGORY_TABS) {
  for (const card of tab.cards) {
    if (!screenToCategoryMap.has(card.screenId)) {
      screenToCategoryMap.set(card.screenId, tab.id);
    }
  }
}

export function getCategoryTabForScreen(screenId: ScreenId): CategoryTabId {
  return screenToCategoryMap.get(screenId) ?? 'start';
}

export function getCategoryTab(id: CategoryTabId): CategoryTabConfig | undefined {
  return CATEGORY_TABS.find((t) => t.id === id);
}
