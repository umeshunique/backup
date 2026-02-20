/**
 * No longer loads data on app startup.
 * Servers load on mount in ServerDatabaseBar. Backup history loads when user opens History (see Index.tsx).
 */
export const DataLoader = () => null;
