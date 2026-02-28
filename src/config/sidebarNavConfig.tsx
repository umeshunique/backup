/**
 * Sidebar navigation: screens list only (no Modules, no DB Management Suite).
 */

import type { LucideIcon } from 'lucide-react';
import {
  Server,
  BarChart3,
  Database,
  Settings,
  GitBranch,
  HardDrive,
  RotateCcw,
  History,
} from 'lucide-react';
import type { ScreenId } from './navigationConfig';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

/** Section can have direct items (Main, Settings) or nested categories */
export interface SidebarSection {
  title: string;
  items?: NavItem[];
  categories?: NavCategory[];
}

/** Main section - Servers, Database Objects, Monitoring, DB Management Suite (all tools), Backup, Restore, History, CI/CD */
const MAIN_ITEMS: NavItem[] = [
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'database-objects', label: 'Database Objects', icon: Database },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'database-management', label: 'DB Management Suite', icon: Database },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'restore', label: 'Restore', icon: RotateCcw },
  { id: 'history', label: 'History', icon: History },
  { id: 'cicd-integration', label: 'CI/CD Integration', icon: GitBranch },
];

/** Settings section */
const SETTINGS_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** When no database selected: Main + Settings (screens list only) */
export const SIDEBAR_SECTIONS_MINIMAL: SidebarSection[] = [
  { title: 'Main', items: MAIN_ITEMS },
  { title: 'Settings', items: SETTINGS_ITEMS },
];

/** Database-related screens only (when a database is selected) */
export const DATABASE_SIDEBAR_ITEMS: NavItem[] = [
  { id: 'sql-editor', label: 'SQL Editor', icon: Database },
  { id: 'data-editor', label: 'Data Editor', icon: Database },
  { id: 'database-objects', label: 'Database Objects', icon: Database },
  { id: 'er-diagram', label: 'ER Diagram', icon: Database },
  { id: 'query-builder', label: 'Query Builder', icon: Database },
  { id: 'procedure-debugger', label: 'Procedure Debugger', icon: Database },
  { id: 'execution-plan-viewer', label: 'Execution Plan', icon: Database },
  { id: 'profiler', label: 'Profiler', icon: Database },
  { id: 'slow-query-analyzer', label: 'Slow Query', icon: Database },
  { id: 'schema-version-control', label: 'Schema Version', icon: Database },
  { id: 'data-compare', label: 'Data Compare', icon: Database },
  { id: 'etl-wizard', label: 'ETL Wizard', icon: Database },
  { id: 'data-generator', label: 'Data Generator', icon: Database },
  { id: 'data-quality-rules', label: 'Data Quality', icon: Database },
];

/** When database selected: Main (Servers) + Database screens + Settings */
export const SIDEBAR_SECTIONS_DATABASE: SidebarSection[] = [
  { title: 'Main', items: [{ id: 'servers', label: 'Servers', icon: Server }] },
  { title: 'Database', items: DATABASE_SIDEBAR_ITEMS },
  { title: 'Settings', items: SETTINGS_ITEMS },
];

/** Full sidebar: same as minimal (screens list only, no module sections) */
export const SIDEBAR_SECTIONS: SidebarSection[] = SIDEBAR_SECTIONS_MINIMAL;
