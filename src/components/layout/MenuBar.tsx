import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, FileText, Pencil, Eye, Database, Wrench, LayoutGrid, HelpCircle } from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    label: 'File',
    items: [
      { label: 'New SQL', action: () => useBackupStore.getState().setActiveTab('sql-editor') },
      { label: 'Open…', action: () => {} },
      { label: 'Recent Files', action: () => useBackupStore.getState().setActiveTab('start') },
      { label: 'Close', action: () => {} },
      { label: 'Exit', action: () => window.close() },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', action: () => {} },
      { label: 'Redo', action: () => {} },
      { label: 'Cut', action: () => {} },
      { label: 'Copy', action: () => {} },
      { label: 'Paste', action: () => {} },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Start Page', action: () => useBackupStore.getState().setActiveTab('start') },
      { label: 'Database Explorer', action: () => {} },
      { label: 'Output', action: () => {} },
      { label: 'Full Screen', action: () => document.documentElement.requestFullscreen?.() },
    ],
  },
  {
    label: 'Database',
    items: [
      { label: 'Backup Database…', action: () => useBackupStore.getState().setActiveTab('backup') },
      { label: 'Restore Database…', action: () => useBackupStore.getState().setActiveTab('restore') },
      { label: 'Schema Compare', action: () => useBackupStore.getState().setActiveTab('compare') },
      { label: 'Manage Servers', action: () => useBackupStore.getState().setActiveTab('servers') },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'SQL Editor', action: () => useBackupStore.getState().setActiveTab('sql-editor') },
      { label: 'Query Builder', action: () => useBackupStore.getState().setActiveTab('query-builder') },
      { label: 'Data Editor', action: () => useBackupStore.getState().setActiveTab('data-editor') },
      { label: 'Settings', action: () => useBackupStore.getState().setActiveTab('settings') },
    ],
  },
  {
    label: 'Window',
    items: [
      { label: 'Minimize', action: () => window.minimize?.() },
      { label: 'Zoom', action: () => {} },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Documentation', action: () => window.open('/API_INTEGRATION_GUIDE.md', '_blank') },
      { label: 'About', action: () => {} },
    ],
  },
];

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div className="h-9 shrink-0 border-b border-border bg-muted/30 flex items-stretch px-1 gap-0">
      {menuItems.map((menu) => (
        <DropdownMenu
          key={menu.label}
          open={openMenu === menu.label}
          onOpenChange={(open) => setOpenMenu(open ? menu.label : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 rounded-none text-xs font-medium text-foreground hover:bg-accent',
                openMenu === menu.label && 'bg-accent'
              )}
            >
              {menu.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            {menu.items.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => {
                  item.action();
                  setOpenMenu(null);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
      <div className="ml-auto flex items-center pr-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
          onClick={() => useBackupStore.getState().setActiveTab('sql-editor')}
          aria-label="AI Assistant"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </Button>
      </div>
    </div>
  );
}
