import { Header, Dashboard, Sidebar } from '@/components/layout';
import { BackupWizard } from '@/components/backup';
import { RestoreWizard } from '@/components/restore';
import { BackupHistoryTable } from '@/components/history';
import { SchemaCompare } from '@/components/compare';
import { ReleaseManagement } from '@/components/release';
import { ServersPage } from '@/components/server';
import { BuildManagement } from '@/components/build';
import { DebugConsolePage } from './DebugConsolePage';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, FolderOpen, Bell, Shield } from 'lucide-react';

function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Storage Settings</h3>
              <p className="text-sm text-muted-foreground">Configure backup storage locations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Email and webhook settings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">Encryption and access control</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Advanced</h3>
              <p className="text-sm text-muted-foreground">Timeouts, limits, and performance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Index = () => {
  const { activeTab } = useBackupStore();

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1800px] mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'servers' && <ServersPage />}
            {activeTab === 'backup' && <BackupWizard />}
            {activeTab === 'restore' && <RestoreWizard />}
            {activeTab === 'compare' && <SchemaCompare />}
            {activeTab === 'release' && <ReleaseManagement />}
            {activeTab === 'builds' && <BuildManagement />}
            {activeTab === 'history' && <BackupHistoryTable />}
            {activeTab === 'console' && <DebugConsolePage />}
            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
