import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Search, Database } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  SIDEBAR_SECTIONS,
  SIDEBAR_SECTIONS_MINIMAL,
  SIDEBAR_SECTIONS_DATABASE,
  type NavItem,
  type NavCategory,
  type SidebarSection,
} from '@/config/sidebarNavConfig';
import { getPageMeta } from '@/components/layout/pageConfig';

function getDefaultCollapsed(sections: SidebarSection[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  sections.forEach((s) => {
    out[s.title] = false;
  });
  return out;
}

function itemMatchesQuery(item: NavItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const meta = getPageMeta(item.id);
  return (
    item.label.toLowerCase().includes(q) ||
    meta.title.toLowerCase().includes(q) ||
    meta.description.toLowerCase().includes(q)
  );
}

function filterSections(sections: SidebarSection[], query: string): SidebarSection[] {
  if (!query.trim()) return sections;
  const q = query.toLowerCase().trim();
  return sections
    .map((section): SidebarSection | null => {
      if (section.items) {
        const filtered = section.items.filter((item) => itemMatchesQuery(item, query));
        if (filtered.length === 0) return null;
        return { ...section, items: filtered };
      }
      if (section.categories) {
        const filteredCategories: NavCategory[] = section.categories
          .map((cat) => {
            const categoryMatches = cat.title.toLowerCase().includes(q);
            const filteredItems = categoryMatches
              ? cat.items
              : cat.items.filter((item) => itemMatchesQuery(item, query));
            if (filteredItems.length === 0) return null;
            return { ...cat, items: filteredItems };
          })
          .filter((c): c is NavCategory => c !== null);
        if (filteredCategories.length === 0) return null;
        return { ...section, categories: filteredCategories };
      }
      return null;
    })
    .filter((s): s is SidebarSection => s !== null);
}

export function Sidebar() {
  const { activeTab, setActiveTab, selectedServerId, selectedDatabaseName, getServerById } = useBackupStore();
  const selectedServer = selectedServerId ? getServerById(selectedServerId) : null;
  const hasDatabaseContext = Boolean(selectedServer && selectedDatabaseName);

  const sections = hasDatabaseContext ? SIDEBAR_SECTIONS_DATABASE : SIDEBAR_SECTIONS_MINIMAL;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => getDefaultCollapsed(sections));
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(
    () => filterSections(sections, searchQuery),
    [sections, searchQuery]
  );

  useEffect(() => {
    setCollapsed((prev) => ({ ...getDefaultCollapsed(sections), ...prev }));
  }, [hasDatabaseContext]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-sections');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        setCollapsed((prev) => ({ ...getDefaultCollapsed(sections), ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, [sections]);

  const toggleSection = (title: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('sidebar-sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside
      className="w-56 shrink-0 border-r border-border bg-background flex flex-col"
      role="navigation"
      aria-label="Main navigation"
    >
      {hasDatabaseContext && (
        <div className="p-2 border-b border-border shrink-0 bg-primary/5">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-primary/20 bg-background/80">
            <Database className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Database context</p>
              <p className="text-xs font-medium truncate" title={`${selectedServer?.name} / ${selectedDatabaseName}`}>
                {selectedServer?.name} / {selectedDatabaseName}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="p-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search screens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-2"
            aria-label="Search screens"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <nav className="p-3 space-y-5">
          {filteredSections.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground text-center">
              No screens match &quot;{searchQuery}&quot;
            </p>
          ) : (
          filteredSections.map((section) => (
            <div key={section.title}>
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className={cn(
                  'flex items-center justify-between w-full px-2 py-2 rounded-md text-xs font-semibold uppercase tracking-wider',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
                )}
                aria-expanded={!collapsed[section.title]}
                aria-controls={`sidebar-section-${section.title.replace(/\s+/g, '-')}`}
              >
                <span>{section.title}</span>
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform duration-200', !collapsed[section.title] && 'rotate-90')}
                  aria-hidden
                />
              </button>

              <div
                id={`sidebar-section-${section.title.replace(/\s+/g, '-')}`}
                className={cn('mt-1 space-y-0.5', collapsed[section.title] && 'hidden')}
              >
                {/* Section with direct items (Main, Settings) */}
                {section.items?.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full justify-start gap-2.5 h-9 px-2.5 rounded-md font-normal',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate text-sm">{item.label}</span>
                    </Button>
                  );
                })}

                {/* Section with nested categories (Development & Data, Operations, DevOps & Lifecycle, etc.) */}
                {section.categories?.map((category) => (
                  <div key={category.title} className="space-y-0.5">
                    {category.items.length > 0 ? (
                      <>
                        <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                          {category.title}
                        </div>
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <Button
                              key={item.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab(item.id)}
                              className={cn(
                                'w-full justify-start gap-2.5 h-9 pl-4 pr-2.5 rounded-md font-normal',
                                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isActive
                                  ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              )}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <Icon className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="truncate text-sm">{item.label}</span>
                            </Button>
                          );
                        })}
                      </>
                    ) : (
                      <div className="px-2.5 py-1.5 pl-4 text-[11px] font-medium text-muted-foreground/60 truncate">
                        {category.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
