import { useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileCode, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleCard } from '@/components/modules';
import { MODULE_CATEGORIES } from '@/components/modules/modulesConfig';
import type { AppItem } from '@/components/modules/modulesConfig';

/** Flatten all apps from all categories. Debug Console is in the bottom panel, so hide from start page to avoid duplicate. */
const ALL_SCREENS: AppItem[] = MODULE_CATEGORIES.flatMap((cat) => cat.apps).filter(
  (app) => app.tabId !== 'console'
);

const ALL_TAB = 'all';

export function StartPage() {
  const [categoryTab, setCategoryTab] = useState(ALL_TAB);
  const [searchQuery, setSearchQuery] = useState('');
  const setActiveTab = useBackupStore((s) => s.setActiveTab);
  const getRecentBackups = useBackupStore((s) => s.getRecentBackups);

  const recentBackups = getRecentBackups(10);
  const filteredRecent = searchQuery.trim()
    ? recentBackups.filter(
        (b) =>
          b.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.databaseName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentBackups;

  const filteredScreens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const noConsole = (apps: AppItem[]) => apps.filter((a) => a.tabId !== 'console');
    const filter = (apps: AppItem[]) =>
      !q ? apps : apps.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    if (categoryTab === ALL_TAB) return filter(ALL_SCREENS);
    const idx = parseInt(categoryTab, 10);
    const cat = MODULE_CATEGORIES[idx];
    const raw = cat ? filter(cat.apps) : [];
    return noConsole(raw);
  }, [categoryTab, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Recent backups — compact section */}
      <Card className="shrink-0 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Backups</h2>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search backups & tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
                aria-label="Search recent backups"
              />
            </div>
          </div>
          <ul className="space-y-1 rounded-md border border-border bg-muted/20 max-h-32 overflow-y-auto">
            {filteredRecent.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                {recentBackups.length === 0 ? 'No recent backups.' : 'No matches.'}
              </li>
            ) : (
              filteredRecent.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('restore')}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 rounded-md transition-colors text-sm"
                  >
                    <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{b.fileName ?? 'Backup'}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {b.databaseName}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      {/* All 103 screens — category tabs with horizontal scroll */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 mb-3 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            All Tools ({ALL_SCREENS.length} screens)
          </h2>
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/30 border-dashed flex-1 max-w-[200px]"
            onClick={() => setActiveTab('database-management')}
          >
            <CardContent className="p-2 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium">Open full hub</span>
            </CardContent>
          </Card>
        </div>

        <Tabs value={categoryTab} onValueChange={setCategoryTab} className="flex-1 flex flex-col min-h-0">
          {/* Horizontal scroll for all category tabs */}
          <div className="shrink-0 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-thin">
            <TabsList className="inline-flex w-max min-w-full h-auto flex-nowrap gap-1 rounded-lg bg-muted/50 p-2 border border-border">
              <TabsTrigger value={ALL_TAB} className="rounded-md shrink-0">
                All ({ALL_SCREENS.length})
              </TabsTrigger>
              {MODULE_CATEGORIES.map((cat, idx) => (
                <TabsTrigger key={idx} value={String(idx)} className="rounded-md shrink-0 whitespace-nowrap">
                  {cat.title} ({cat.apps.length})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={ALL_TAB} className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-6">
              {filteredScreens.map((app) => (
                <ModuleCard key={app.title} app={app} />
              ))}
              {filteredScreens.length === 0 && (
                <p className="col-span-full py-8 text-center text-muted-foreground text-sm">
                  No screens match your search.
                </p>
              )}
            </div>
          </TabsContent>

          {MODULE_CATEGORIES.map((cat, idx) => (
            <TabsContent key={idx} value={String(idx)} className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-3">{cat.subtitle}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-6">
                {filteredScreens.map((app) => (
                  <ModuleCard key={app.title} app={app} />
                ))}
                {filteredScreens.length === 0 && (
                  <p className="col-span-full py-8 text-center text-muted-foreground text-sm">
                    No screens match your search in this category.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
