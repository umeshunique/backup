import { useState, useEffect, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import type { CodeSnippet, SnippetFilter } from './types';
import { loadSnippets, saveSnippets } from './storage';
import { SnippetEditorDialog } from './SnippetEditorDialog';
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
  FileCode,
  FolderOpen,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const FILTERS: { id: SnippetFilter; label: string; icon: typeof FolderOpen }[] = [
  { id: 'all', label: 'All snippets', icon: FolderOpen },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'templates', label: 'Templates', icon: FileCode },
];

function generateId(): string {
  return `snippet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CodeSnippetsLibrary() {
  const setActiveTab = useBackupStore((s) => s.setActiveTab);
  const setSqlEditorInitialSql = useBackupStore((s) => s.setSqlEditorInitialSql);

  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [filter, setFilter] = useState<SnippetFilter>('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);

  useEffect(() => {
    setSnippets(loadSnippets());
  }, []);

  const persist = (next: CodeSnippet[]) => {
    setSnippets(next);
    saveSnippets(next);
  };

  const filteredSnippets = useMemo(() => {
    let list = snippets;
    if (filter === 'favorites') list = list.filter((s) => s.isFavorite);
    if (filter === 'templates') list = list.filter((s) => s.isTemplate);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.sql.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [snippets, filter, search]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [snippets]);

  const handleSave = (payload: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }) => {
    const now = new Date().toISOString();
    if (payload.id) {
      const existing = snippets.find((s) => s.id === payload.id);
      if (existing) {
        persist(
          snippets.map((s) =>
            s.id === payload.id
              ? {
                  ...s,
                  title: payload.title,
                  description: payload.description ?? '',
                  sql: payload.sql,
                  tags: payload.tags ?? [],
                  parameters: payload.parameters ?? [],
                  isFavorite: payload.isFavorite ?? false,
                  isTemplate: payload.isTemplate ?? false,
                  updatedAt: now,
                }
              : s
          )
        );
        toast({ title: 'Snippet updated' });
        return;
      }
    }
    const newSnippet: CodeSnippet = {
      id: generateId(),
      title: payload.title,
      description: payload.description ?? '',
      sql: payload.sql,
      tags: payload.tags ?? [],
      parameters: payload.parameters ?? [],
      isFavorite: payload.isFavorite ?? false,
      isTemplate: payload.isTemplate ?? false,
      createdAt: now,
      updatedAt: now,
    };
    persist([...snippets, newSnippet]);
    toast({ title: 'Snippet created' });
  };

  const toggleFavorite = (id: string) => {
    persist(
      snippets.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite, updatedAt: new Date().toISOString() } : s))
    );
  };

  const deleteSnippet = (id: string) => {
    persist(snippets.filter((s) => s.id !== id));
    if (editingSnippet?.id === id) {
      setEditorOpen(false);
      setEditingSnippet(null);
    }
    toast({ title: 'Snippet deleted' });
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
            Library
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
              placeholder="Search snippets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => { setEditingSnippet(null); setEditorOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            New snippet
          </Button>
        </div>

        {filteredSnippets.length === 0 ? (
          <Card className="border-dashed flex-1 flex items-center justify-center min-h-[240px]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Code2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {snippets.length === 0 ? 'No snippets yet' : 'No matching snippets'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {snippets.length === 0
                  ? 'Create reusable SQL snippets with parameters and tags. Open them in the SQL Editor or copy to clipboard.'
                  : 'Try a different filter or search term.'}
              </p>
              {snippets.length === 0 && (
                <Button onClick={() => { setEditingSnippet(null); setEditorOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create first snippet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="flex-1 -mx-1 px-1 scrollbar-thin">
            <ul className="space-y-3 pb-4">
              {filteredSnippets.map((snippet) => (
                <li key={snippet.id}>
                  <Card className="overflow-hidden transition-colors hover:bg-muted/30">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">{snippet.title}</h3>
                            {snippet.isFavorite && (
                              <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" aria-label="Favorite" />
                            )}
                            {snippet.isTemplate && (
                              <Badge variant="secondary" className="text-xs">Template</Badge>
                            )}
                          </div>
                          {snippet.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {snippet.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" aria-label="Actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(snippet.sql)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy SQL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openInSqlEditor(snippet.sql)}>
                              <Code2 className="h-4 w-4 mr-2" />
                              Open in SQL Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(snippet.id)}>
                              <Star className={cn('h-4 w-4 mr-2', snippet.isFavorite && 'fill-amber-500 text-amber-500')} />
                              {snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setEditingSnippet(snippet); setEditorOpen(true); }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteSnippet(snippet.id)}
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
                        {snippet.sql.slice(0, 300)}
                        {snippet.sql.length > 300 ? '…' : ''}
                      </pre>
                      {snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {snippet.tags.map((tag) => (
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
                          onClick={() => copyToClipboard(snippet.sql)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openInSqlEditor(snippet.sql)}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          Open in SQL Editor
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => { setEditingSnippet(snippet); setEditorOpen(true); }}
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

      <SnippetEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        snippet={editingSnippet}
        onSave={handleSave}
      />
    </div>
  );
}
