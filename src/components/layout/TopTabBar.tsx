import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import {
  CATEGORY_TABS,
  getCategoryTabForScreen,
  CATEGORY_DEFAULT_SCREEN,
  type CategoryTabId,
} from '@/config/categoryTabsConfig';

export function TopTabBar() {
  const { activeTab, setActiveTab } = useBackupStore();
  const activeCategoryTab = getCategoryTabForScreen(activeTab);

  const handleTabClick = (tabId: CategoryTabId) => {
    const defaultScreen = CATEGORY_DEFAULT_SCREEN[tabId];
    setActiveTab(defaultScreen);
  };

  return (
    <div
      className="shrink-0 border-b border-primary/20 bg-background"
      role="tablist"
      aria-label="Screen category tabs"
    >
      <div className="flex items-end gap-0">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategoryTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'relative px-5 py-3 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {/* Active tab underline */}
              <span
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      {/* Thin separator line under all tabs */}
      <div className="h-px bg-primary/20" aria-hidden />
    </div>
  );
}
