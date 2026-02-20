/**
 * Database Management Suite - All screens split into category tabs.
 * Single source: MODULE_CATEGORIES. Search filters within active tab or all.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleCard } from '@/components/modules';
import { MODULE_CATEGORIES } from '@/components/modules/modulesConfig';
import { Database, Layers, Search } from 'lucide-react';
import type { AppItem } from '@/components/modules/modulesConfig';

/** Flatten all apps from all categories. */
const ALL_SCREENS: AppItem[] = MODULE_CATEGORIES.flatMap((cat) => cat.apps);

function filterScreens(screens: AppItem[], query: string): AppItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return screens;
  return screens.filter(
    (app) =>
      app.title.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
  );
}

/** Tab value for "All" vs category index. */
const ALL_TAB = 'all';

export function DatabaseManagementHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(ALL_TAB);

  const filteredByTab = useMemo(() => {
    if (activeTab === ALL_TAB) {
      return filterScreens(ALL_SCREENS, searchQuery);
    }
    const idx = parseInt(activeTab, 10);
    const cat = MODULE_CATEGORIES[idx];
    if (!cat) return [];
    return filterScreens(cat.apps, searchQuery);
  }, [activeTab, searchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-0">
      {/* Hero */}
      <Card className="overflow-hidden shrink-0 border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/15 p-3">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2 text-xs">
                    Database Management Suite
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    All Tools
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-muted-foreground leading-relaxed">
                All database tools in one place—development, design, compare, backup, admin, data tools, performance, and compliance.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-normal">Multi-server</Badge>
                <Badge variant="outline" className="font-normal">{ALL_SCREENS.length} screens</Badge>
                <Badge variant="outline" className="font-normal">{MODULE_CATEGORIES.length} categories</Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-xl border bg-card/50 p-6">
              <div className="flex flex-col items-center gap-1">
                <Layers className="h-10 w-10 text-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground">All screens</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="shrink-0 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder={`Search ${ALL_SCREENS.length} screens...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50 max-w-md"
            aria-label="Search screens"
          />
        </div>
        {searchQuery.trim() && (
          <p className="text-sm text-muted-foreground">
            {filteredByTab.length} match{filteredByTab.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      {/* Category tabs + content — horizontal scroll to see all 20+ categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
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

        <TabsContent value={ALL_TAB} className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-6">
              {filteredByTab.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted-foreground">
                  No screens match &quot;{searchQuery.trim()}&quot;. Try another term.
                </p>
              ) : (
                filteredByTab.map((app) => (
                  <ModuleCard key={app.title} app={app} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {MODULE_CATEGORIES.map((cat, idx) => (
          <TabsContent key={idx} value={String(idx)} className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">{cat.subtitle}</p>
            </div>
            <ScrollArea className="h-full">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-6">
                {filteredByTab.length === 0 ? (
                  <p className="col-span-full py-12 text-center text-muted-foreground">
                    No screens match &quot;{searchQuery.trim()}&quot; in this category.
                  </p>
                ) : (
                  filteredByTab.map((app) => (
                    <ModuleCard key={app.title} app={app} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
