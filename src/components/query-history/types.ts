export interface SavedQuery {
  id: string;
  /** Optional label; falls back to truncated SQL */
  title?: string;
  sql: string;
  tags: string[];
  isFavorite: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QueryHistoryFilter = 'all' | 'favorites';
