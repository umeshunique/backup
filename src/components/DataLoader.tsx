import { useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';

/**
 * Component to load initial data from API on app startup
 */
export const DataLoader = () => {
  const loadServers = useBackupStore((state) => state.loadServers);
  const loadBackupHistory = useBackupStore((state) => state.loadBackupHistory);

  useEffect(() => {
    // Load all data when app starts
    const loadData = async () => {
      console.log('Loading data from API...');
      await Promise.all([
        loadServers(),
        loadBackupHistory(),
      ]);
      console.log('Data loaded successfully');
    };

    loadData();
  }, [loadServers, loadBackupHistory]);

  // This component doesn't render anything
  return null;
};
