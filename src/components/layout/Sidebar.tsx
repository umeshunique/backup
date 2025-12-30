import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Upload,
  Download,
  History,
  Settings,
  GitCompare,
  ChevronRight,
  Server,
  Package,
  Rocket,
} from 'lucide-react';
import { useState } from 'react';

const menuSections = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'servers' as const, label: 'Servers', icon: Server },
    ]
  },
  {
    title: 'Operations',
    items: [
      { id: 'backup' as const, label: 'Backup', icon: Upload },
      { id: 'restore' as const, label: 'Restore', icon: Download },
    ]
  },
  {
    title: 'Advanced',
    items: [
      { id: 'compare' as const, label: 'Compare', icon: GitCompare },
      { id: 'release' as const, label: 'Release', icon: Rocket },
      { id: 'builds' as const, label: 'Builds', icon: Package },
    ]
  },
  {
    title: 'Other',
    items: [
      { id: 'history' as const, label: 'History', icon: History },
      { id: 'settings' as const, label: 'Settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useBackupStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-56 border-r border-border bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {menuSections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{section.title}</span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 transition-transform',
                  !collapsed[section.title] && 'rotate-90'
                )}
              />
            </button>

            {!collapsed[section.title] && (
              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full justify-start gap-2 h-8 px-2',
                        isActive && 'bg-secondary'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
