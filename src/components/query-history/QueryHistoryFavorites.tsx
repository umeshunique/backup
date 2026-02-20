import { useState, useEffect, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import type { SavedQuery, QueryHistoryFilter } from './types';
import { loadSavedQueries, saveSavedQueries } from './storage';
import { QueryEditorDialog } from './QueryEditorDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  Copy,
  Code2,
  Pencil,
  Trash2,
  Star,
  History,
  FolderOpen,
  Tag,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const FILTERS: { id: QueryHistoryFilter; label: string; icon: typeof FolderOpen }[] = [
  { id: 'all', label: 'All queries', icon: FolderOpen },
  { id: 'favorites', label: 'Favorites', icon: Star },
];

function generateId(): string {
  return `query-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function displayTitle(q: SavedQuery): string {
  if (q.title?.trim()) return q.title;
  const firstLine = q.sql.trim().split('\n')[0] ?? '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

export function QueryHistoryFavorites() {
  const setActiveTab = useBackupStore((s) => s.setActiveTab);
  const setSqlEditorInitialSql = useBackupStore((s) => s.setSqlEditorInitialSql);

  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [filter, setFilter] = useState<QueryHistoryFilter>('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);

  useEffect(() => {
    setQueries(loadSavedQueries());
  }, []);

  const persist = (next: SavedQuery[]) => {
    setQueries(next);
    saveSavedQueries(next);
  };

  const filteredQueries = useMemo(() => {
    let list = queries;
    if (filter === 'favorites') list = list.filter((q) => q.isFavorite);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          (item.title ?? '').toLowerCase().includes(q) ||
          item.sql.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [queries, filter, search]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    queries.forEach((q) => q.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [queries]);

  const handleSave = (
    payload: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ) => {
    const now = new Date().toISOString();
    if (payload.id) {
      const existing = queries.find((q) => q.id === payload.id);
      if (existing) {
        persist(
          queries.map((q) =>
            q.id === payload.id
              ? {
                  ...q,
                  title: payload.title,
                  sql: payload.sql ?? q.sql,
                  tags: payload.tags ?? [],
                  isFavorite: payload.isFavorite ?? false,
                  runCount: payload.runCount ?? q.runCount,
                  lastRunAt: payload.lastRunAt ?? q.lastRunAt,
                  updatedAt: now,
                }
              : q
          )
        );
        toast({ title: 'Query updated' });
        return;
      }
    }
    const newQuery: SavedQuery = {
      id: generateId(),
      title: payload.title,
      sql: payload.sql ?? '',
      tags: payload.tags ?? [],
      isFavorite: payload.isFavorite ?? false,
      runCount: payload.runCount ?? 0,
      lastRunAt: payload.lastRunAt ?? null,
      createdAt: payload.createdAt ?? now,
      updatedAt: payload.updatedAt ?? now,
    };
    persist([...queries, newQuery]);
    toast({ title: 'Query saved' });
  };

  const toggleFavorite = (id: string) => {
    persist(
      queries.map((q) =>
        q.id === id ? { ...q, isFavorite: !q.isFavorite, updatedAt: new Date().toISOString() } : q
      )
    );
  };

  const logRun = (id: string) => {
    const now = new Date().toISOString();
    persist(
      queries.map((q) =>
        q.id === id ? { ...q, runCount: q.runCount + 1, lastRunAt: now, updatedAt: now } : q
      )
    );
    toast({ title: 'Run logged' });
  };

  const deleteQuery = (id: string) => {
    persist(queries.filter((q) => q.id !== id));
    if (editingQuery?.id === id) {
      setEditorOpen(false);
      setEditingQuery(null);
    }
    toast({ title: 'Query removed' });
  };

  const copyToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast({ title: 'Copied to clipboard' });
  };

  const openInSqlEditor = (sql: string) => {
    if (typeof setSqlEditorInitialSql === 'function') {
      setSqlEditorInitialSql(sql);
    } else {
      navigator.clipboard.writeText(sql);
      toast({ title: 'Copied. Open SQL Editor and paste.' });
    }
    setActiveTab('sql-editor');
  };

  return (
    <div className="flex flex-1 min-h-0 gap-6">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter
          </span>
        </div>
        <ScrollArea className="flex-1 scrollbar-thin">
          <nav className="p-2 space-y-0.5">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = filter === f.id;
              return (
                <Button
                  key={f.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'w-full justify-start gap-2.5 h-9 px-2.5 rounded-md font-normal',
                    isActive
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm">{f.label}</span>
                </Button>
              );
            })}
            {allTags.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  Tags
                </div>
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch((q) => (q ? `${q} ${tag}` : tag))}
                    className="w-full justify-start gap-2 h-8 pl-4 pr-2.5 rounded-md font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 text-xs"
                  >
                    <Tag className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tag}</span>
                  </Button>
                ))}
              </>
            )}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, SQL, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => {
              setEditingQuery(null);
              setEditorOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add query
          </Button>
        </div>

        {filteredQueries.length === 0 ? (
          <Card className="border-dashed flex-1 flex items-center justify-center min-h-[240px]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {queries.length === 0 ? 'No saved queries yet' : 'No matching queries'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {queries.length === 0
                  ? 'Save queries here with favorites, tags, and run count. Open them in the SQL Editor or log runs.'
                  : 'Try a different filter or search term.'}
              </p>
              {queries.length === 0 && (
                <Button
                  onClick={() => {
                    setEditingQuery(null);
                    setEditorOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add first query
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="flex-1 -mx-1 px-1 scrollbar-thin">
            <ul className="space-y-3 pb-4">
              {filteredQueries.map((item) => (
                <li key={item.id}>
                  <Card className="overflow-hidden transition-colors hover:bg-muted/30">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">{displayTitle(item)}</h3>
                            {item.isFavorite && (
                              <Star
                                className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500"
                                aria-label="Favorite"
                              />
                            )}
                            <Badge variant="secondary" className="text-xs font-normal">
                              {item.runCount} run{item.runCount !== 1 ? 's' : ''}
                            </Badge>
                            {item.lastRunAt && (
                              <span className="text-xs text-muted-foreground">
                                Last: {new Date(item.lastRunAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(item.sql)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy SQL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openInSqlEditor(item.sql)}>
                              <Code2 className="h-4 w-4 mr-2" />
                              Open in SQL Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => logRun(item.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Log run
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(item.id)}>
                              <Star
                                className={cn(
                                  'h-4 w-4 mr-2',
                                  item.isFavorite && 'fill-amber-500 text-amber-500'
                                )}
                              />
                              {item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingQuery(item);
                                setEditorOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteQuery(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <pre className="text-xs font-mono text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                        {item.sql.slice(0, 300)}
                        {item.sql.length > 300 ? '…' : ''}
                      </pre>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => copyToClipboard(item.sql)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openInSqlEditor(item.sql)}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          Open in SQL Editor
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => logRun(item.id)}>
                          <Play className="h-3.5 w-3.5" />
                          Log run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setEditingQuery(item);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>

      <QueryEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        query={editingQuery}
        onSave={handleSave}
      />
    </div>
  );
}
