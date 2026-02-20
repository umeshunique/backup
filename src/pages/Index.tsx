import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  Header,
  MenuBar,
  TopTabBar,
  ServerDatabaseBar,
  ConnectionPlaceholder,
  DatabaseExplorer,
  BottomPanel,
} from '@/components/layout';
import { ServerConfigWizard } from '@/components/server';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { SCREEN_COMPONENTS, DATABASE_SCREEN_IDS } from '@/config/screenRegistry';
import { AddServerContext } from '@/contexts/AddServerContext';
import type { ServerConfig } from '@/types/backup.types';
import NotFound from '@/pages/NotFound';

const Index = () => {
  const { screenId: paramScreenId } = useParams<{ screenId?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { activeTab, setActiveTab, selectedServerId, selectedDatabaseName, loadBackupHistory, addServer, updateServer, getServerById } = useBackupStore();
  const connectionBarRef = useRef<HTMLDivElement | null>(null);
  const [addServerDialogOpen, setAddServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);

  const handleAddServerClick = useCallback(() => {
    setEditingServer(null);
    setAddServerDialogOpen(true);
  }, []);

  const handleEditServerClick = useCallback(() => {
    if (selectedServerId) {
      const server = getServerById(selectedServerId);
      if (server) {
        setEditingServer(server);
        setAddServerDialogOpen(true);
      }
    }
  }, [selectedServerId, getServerById]);

  const isDatabaseObjectsScreen = activeTab === 'database-objects';
  const isFullHeightScreen = isDatabaseObjectsScreen || activeTab === 'sql-editor';

  // On open/refresh always land on SQL Editor; keep URL in sync with activeTab
  useEffect(() => {
    navigate('/sql-editor', { replace: true });
    setActiveTab('sql-editor');
  }, []);

  // Sync store -> URL when activeTab changes (so Back/Forward and links update the address bar)
  useEffect(() => {
    const currentPath = paramScreenId ?? (pathname === '/' ? '' : pathname.slice(1).split('/')[0] ?? '');
    if (activeTab !== currentPath) {
      navigate(activeTab ? `/${activeTab}` : '/', { replace: pathname === '/' });
    }
  }, [activeTab, paramScreenId, pathname, navigate]);

  useEffect(() => {
    if (activeTab === 'history') loadBackupHistory();
  }, [activeTab, loadBackupHistory]);

  // Wire API query execution to Action Output log in bottom panel
  useEffect(() => {
    const { addActionLogEntry } = useBackupStore.getState();
    apiClient.setOnQueryExecuted((e) => addActionLogEntry(e));
    return () => apiClient.setOnQueryExecuted(undefined);
  }, []);

  const isDatabaseScreen = DATABASE_SCREEN_IDS.includes(activeTab);
  const showDatabasePlaceholder = isDatabaseScreen && !(selectedServerId && selectedDatabaseName);
  const Screen = showDatabasePlaceholder
    ? null
    : (SCREEN_COMPONENTS[activeTab] ?? null);
  const isServersScreen = activeTab === 'servers';

  return (
    <AddServerContext.Provider value={handleAddServerClick}>
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <MenuBar />
        <TopTabBar />
        <div ref={connectionBarRef}>
          <ServerDatabaseBar onAddServerClick={handleAddServerClick} onEditServerClick={handleEditServerClick} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0 min-w-0">
            {!isServersScreen && !isDatabaseObjectsScreen && (
              <DatabaseExplorer onAddServerClick={handleAddServerClick} />
            )}
            <main
              className={
                isFullHeightScreen
                  ? 'flex-1 overflow-hidden min-w-0 flex flex-col min-h-0'
                  : 'flex-1 overflow-y-auto scrollbar-thin min-w-0 flex flex-col min-h-0'
              }
            >
              <div
                className={
                  isFullHeightScreen
                    ? 'flex flex-1 min-h-0 min-w-0'
                    : 'p-6 max-w-[1800px] mx-auto min-h-full'
                }
              >
                {showDatabasePlaceholder ? (
                  <ConnectionPlaceholder
                    connectionBarRef={connectionBarRef}
                    onAddServerClick={handleAddServerClick}
                  />
                ) : Screen != null ? (
                  Screen
                ) : (
                  <NotFound />
                )}
              </div>
            </main>
          </div>
          <BottomPanel />
        </div>

      {/* Add Server dialog — open from connection bar so users can add a server from any page */}
      <ServerConfigWizard
        open={addServerDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingServer(null);
          setAddServerDialogOpen(open);
        }}
        server={editingServer}
        onSave={async (data) => {
          try {
            if (editingServer) {
              await updateServer(editingServer.id, data);
              setAddServerDialogOpen(false);
              setEditingServer(null);
              toast({
                title: 'Server Updated',
                description: 'The server configuration has been updated.',
              });
            } else {
              await addServer(data);
              setAddServerDialogOpen(false);
              toast({
                title: 'Server Added',
                description: 'New server configuration has been added.',
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : (editingServer ? 'Failed to update server.' : 'Failed to add server.');
            toast({
              title: 'Error',
              description: message,
              variant: 'destructive',
            });
            throw error;
          }
        }}
      />
      </div>
    </AddServerContext.Provider>
  );
};

export default Index;
