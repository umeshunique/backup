import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  LayoutDashboard,
  Upload,
  Download,
  History,
  Settings,
  Clock,
  HardDrive,
  GitCompare,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'backup' as const, label: 'Backup', icon: Upload },
  { id: 'restore' as const, label: 'Restore', icon: Download },
  { id: 'compare' as const, label: 'Compare', icon: GitCompare },
  { id: 'release' as const, label: 'Release', icon: GitCompare },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function Header() {
  const { servers } = useBackupStore();
  const connectedServers = servers.filter((s) => s.connectionStatus === 'connected').length;
  const [theme, setTheme] = useState<'light' | 'dark' | 'neon'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'neon' || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (selectedTheme: 'light' | 'dark' | 'neon') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'neon');
    root.classList.add(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
  };

  const changeTheme = (newTheme: 'light' | 'dark' | 'neon') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4">
      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Database className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-base font-semibold tracking-tight">Database Management</h1>
      </div>

      {/* Server Status */}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-muted-foreground">{connectedServers}/{servers.length} servers</span>
        </div>

        {/* Theme Toggle Buttons */}
        <div className="flex items-center gap-1 border-l pl-3">
          <Button
            variant={theme === 'light' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('light')}
            className="h-8 w-8 p-0"
            title="Light Theme"
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('dark')}
            className="h-8 w-8 p-0"
            title="Dark Theme"
          >
            <Moon className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === 'neon' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('neon')}
            className="h-8 w-8 p-0"
            title="Neon Theme"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
