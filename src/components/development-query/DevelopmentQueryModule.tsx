/**
 * Development & Query module - uses modulesConfig (category index 0).
 * No duplicate app definitions.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModuleCard } from '@/components/modules';
import { MODULE_CATEGORIES } from '@/components/modules/modulesConfig';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionId = 'available' | 'coming-soon';

/** Development & Query = first category in modulesConfig */
const DEV_QUERY_CATEGORY = MODULE_CATEGORIES[0];
const AVAILABLE_APPS = (DEV_QUERY_CATEGORY?.apps ?? []).filter((a) => a.tabId);
const COMING_SOON_APPS = (DEV_QUERY_CATEGORY?.apps ?? []).filter((a) => !a.tabId);

const SECTIONS: { id: SectionId; label: string; icon: typeof CheckCircle2 }[] = [
  { id: 'available', label: 'Available', icon: CheckCircle2 },
  { id: 'coming-soon', label: 'Coming soon', icon: Clock },
];

export function DevelopmentQueryModule() {
  const [selectedSection, setSelectedSection] = useState<SectionId>('available');

  return (
    <div className="flex flex-1 min-h-0 gap-4">
      {/* Left panel: sections */}
      <aside
        className="w-56 shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col"
        aria-label="Development & Query sections"
      >
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sections
          </span>
        </div>
        <ScrollArea className="flex-1 scrollbar-thin">
          <nav className="p-2 space-y-0.5">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = selectedSection === section.id;
              return (
                <Button
                  key={section.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSection(section.id)}
                  className={cn(
                    'w-full justify-start gap-2.5 h-9 px-2.5 rounded-md font-normal',
                    isActive
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm">{section.label}</span>
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Right: selected section content */}
      <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
        {selectedSection === 'available' && (
          <section className="space-y-4" aria-labelledby="available-title">
            <h2 id="available-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Available
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_APPS.map((app) => (
                <ModuleCard key={app.tabId!} app={app} />
              ))}
            </div>
          </section>
        )}

        {selectedSection === 'coming-soon' && (
          <section className="space-y-4" aria-labelledby="coming-soon-title">
            <h2 id="coming-soon-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Coming soon
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON_APPS.map((app) => (
                <ModuleCard key={app.title} app={app} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
