import { useBackupStore } from '@/store/backupStore';
import { Button } from '@/components/ui/button';
import { Database, Sun, Moon, Sparkles, ChevronRight, Menu, Search, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPageMeta } from './pageConfig';
import { ScreenSearchDialog } from './ScreenSearchDialog';

export function Header() {
  const { servers, activeTab, setActiveTab, goBack, goForward, screenHistory, historyIndex } = useBackupStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const isServersOnlyScreen = activeTab === 'servers';
  const connectedServers = servers.filter((s) => s.connectionStatus === 'connected').length;
  const [theme, setTheme] = useState<'light' | 'dark' | 'neon'>('light');
  const pageMeta = getPageMeta(activeTab);
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < screenHistory.length - 1;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'neon' || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    <header className="h-14 shrink-0 border-b border-border bg-background flex items-center px-4 gap-4">
      {/* Menu (only on servers-only first screen) */}
      {isServersOnlyScreen && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setActiveTab('modules')}
          aria-label="Open menu and all modules"
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">Menu</span>
        </Button>
      )}

      {/* Back / Forward */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Previous screen"
          title="Previous screen"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Next screen"
          title="Next screen"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Logo + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="rounded-lg bg-primary/10 p-1.5 shrink-0" aria-hidden>
          <Database className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-semibold tracking-tight text-foreground truncate hidden sm:inline">
            Database Management
          </span>
          <span className="text-muted-foreground shrink-0 hidden sm:inline" aria-hidden>
            <ChevronRight className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-muted-foreground truncate" title={pageMeta.title}>
            {pageMeta.title}
          </span>
        </div>
      </div>

      {/* Screen search + Server Status + Theme */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-muted-foreground"
          onClick={() => setSearchOpen(true)}
          aria-label="Search all screens (Ctrl+K)"
          title="Search all screens (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">Ctrl+K</kbd>
        </Button>
        <ScreenSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={setActiveTab}
        />
        {servers.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs" title="Connected servers">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${connectedServers === servers.length ? 'bg-green-500' : 'bg-amber-500'}`}
              aria-hidden
            />
            <span className="text-muted-foreground whitespace-nowrap">
              {connectedServers}/{servers.length} servers
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-border pl-3" role="group" aria-label="Theme">
          <Button
            variant={theme === 'light' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('light')}
            className="h-8 w-8 p-0"
            title="Light theme"
            aria-pressed={theme === 'light'}
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('dark')}
            className="h-8 w-8 p-0"
            title="Dark theme"
            aria-pressed={theme === 'dark'}
          >
            <Moon className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === 'neon' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeTheme('neon')}
            className="h-8 w-8 p-0"
            title="Neon theme"
            aria-pressed={theme === 'neon'}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
