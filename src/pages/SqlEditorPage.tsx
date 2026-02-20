import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { SqlEditor, DEFAULT_SQL } from '@/components/server/SqlEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Plus, X, GripVertical, ExternalLink } from 'lucide-react';
import { savePopoutPayload } from '@/pages/SqlEditorPopoutPage';

export interface SqlEditorTab {
  id: string;
  label: string;
  sql: string;
}

const newTabId = () => `sql-tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * SQL Editor uses the global connection from the bar (ServerDatabaseBar).
 * Multiple tabs, each with its own SQL; layout is flexible and can expand.
 */
export function SqlEditorPage() {
  const {
    sqlEditorInitialSql,
    setSqlEditorInitialSql,
    selectedServerId,
    selectedDatabaseName,
    getServerById,
  } = useBackupStore();

  const [tabs, setTabs] = useState<SqlEditorTab[]>(() => [
    { id: newTabId(), label: 'Query 1', sql: DEFAULT_SQL },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedServer = selectedServerId ? getServerById(selectedServerId) : undefined;
  const canRunQueries = selectedServer && selectedDatabaseName;

  const activeId = activeTabId && tabs.some((t) => t.id === activeTabId) ? activeTabId : tabs[0]?.id ?? null;
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeId), [tabs, activeId]);

  useEffect(() => {
    if (tabs.length > 0 && !activeId) setActiveTabId(tabs[0].id);
  }, [tabs.length, activeId]);

  const addTab = useCallback((initialSql = '') => {
    const n = tabs.length + 1;
    const tab: SqlEditorTab = {
      id: newTabId(),
      label: `Query ${n}`,
      sql: initialSql,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    return tab.id;
  }, [tabs.length]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return [{ id: newTabId(), label: 'Query 1', sql: DEFAULT_SQL }];
      return next;
    });
    setActiveTabId((current) => {
      if (current === id) {
        const remaining = tabs.filter((t) => t.id !== id);
        return remaining[0]?.id ?? remaining[1]?.id ?? null;
      }
      return current;
    });
  }, [tabs]);

  const updateTabSql = useCallback((id: string, sql: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, sql } : t)));
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setTabs((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setDragOverIndex(null);
    setDraggedTabId(null);
  }, []);

  const handlePopOut = useCallback(
    (tab: SqlEditorTab) => {
      if (!selectedServerId || !selectedDatabaseName) return;
      const k = savePopoutPayload(tab.sql, selectedServerId, selectedDatabaseName);
      const base = window.location.pathname.replace(/\/[^/]*$/, '') || '';
      const url = `${window.location.origin}${base}/sql-editor-popout?k=${encodeURIComponent(k)}`;
      const w = Math.min(1600, Math.max(800, window.screen.availWidth * 0.6));
      const h = Math.min(1000, Math.max(600, window.screen.availHeight * 0.8));
      window.open(url, '_blank', `width=${w},height=${h},resizable=yes,scrollbars=yes`);
    },
    [selectedServerId, selectedDatabaseName]
  );

  useEffect(() => {
    if (!sqlEditorInitialSql?.trim()) return;
    addTab(sqlEditorInitialSql.trim());
    setSqlEditorInitialSql(null);
  }, [sqlEditorInitialSql, addTab, setSqlEditorInitialSql]);

  if (!canRunQueries || !selectedServer || !selectedDatabaseName) return null;

  return (
    <div className="min-h-0 flex flex-col flex-1 w-full animate-fade-in" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Screen title: Database Management > SQL Editor */}
      <header className="shrink-0 border-b border-border bg-muted/20 px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className="select-none">Database Management</span>
        <span aria-hidden className="text-muted-foreground/60">›</span>
        <span className="font-medium text-foreground">SQL Editor</span>
      </header>
      <Tabs
        value={activeId ?? ''}
        onValueChange={(v) => v && setActiveTabId(v)}
        className="flex flex-col flex-1 min-h-0 w-full"
        style={{ width: '100%', maxWidth: '100%' }}
      >
        <div className="flex items-center gap-1 border-b bg-muted/30 px-1 py-1 shrink-0">
          <TabsList
            className="h-9 p-0.5 bg-transparent border-0 rounded-none gap-0.5 flex-1 overflow-x-auto justify-start min-w-0 flex"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (!id) return;
              const fromIndex = tabs.findIndex((t) => t.id === id);
              if (fromIndex === -1) return;
              const toIndex = dragOverIndex ?? fromIndex;
              reorderTabs(fromIndex, toIndex);
              setDragOverIndex(null);
              setDraggedTabId(null);
            }}
            onDragLeave={() => setDragOverIndex(null)}
          >
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={cn(
                  'flex items-center rounded-md shrink-0 max-w-[200px] group',
                  dragOverIndex === index && 'ring-1 ring-primary/50',
                  draggedTabId === tab.id && 'opacity-50'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverIndex(index);
                }}
              >
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', tab.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedTabId(tab.id);
                  }}
                  onDragEnd={() => {
                    setDraggedTabId(null);
                    setDragOverIndex(null);
                  }}
                  className="cursor-grab active:cursor-grabbing p-0.5 rounded opacity-50 hover:opacity-100 touch-none"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <TabsTrigger
                  value={tab.id}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-sm font-medium gap-1 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
                    'min-w-0 truncate flex-1'
                  )}
                >
                  <span className="truncate" title={tab.label}>
                    {tab.label}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Pop out ${tab.label} to new window`}
                        className="opacity-50 hover:opacity-100 rounded p-0.5 hover:bg-muted cursor-pointer inline-flex"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePopOut(tab);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePopOut(tab);
                          }
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Pop out to new window (move to another monitor)</TooltipContent>
                  </Tooltip>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Close ${tab.label}`}
                    className="opacity-60 hover:opacity-100 rounded p-0.5 hover:bg-muted cursor-pointer inline-flex"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        closeTab(tab.id);
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </TabsTrigger>
              </div>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => addTab()}
            aria-label="New query tab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full" style={{ width: '100%', maxWidth: '100%' }}>
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 min-h-0 min-w-0 overflow-hidden mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden w-full"
              style={{ width: '100%', maxWidth: '100%' }}
            >
              <div className="h-full min-h-0 flex flex-col overflow-hidden flex-1 pt-1 pb-0 w-full" style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}>
                <SqlEditor
                  key={tab.id}
                  server={selectedServer}
                  database={selectedDatabaseName}
                  value={tab.sql}
                  onSqlChange={(sql) => updateTabSql(tab.id, sql)}
                />
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
