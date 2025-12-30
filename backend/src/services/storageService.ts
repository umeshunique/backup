import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../config/env.js';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), config.storage.dataPath);

export class StorageService {
  /**
   * Generic read from JSON file
   */
  private async readJSON<T>(filename: string): Promise<T[]> {
    try {
      const filePath = join(DATA_DIR, filename);
      if (!existsSync(filePath)) {
        return [];
      }
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return [];
    }
  }

  /**
   * Generic write to JSON file
   */
  private async writeJSON<T>(filename: string, data: T[]): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      const filePath = join(DATA_DIR, filename);
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      throw error;
    }
  }

  // ============================================
  // SERVERS
  // ============================================
  async getServers(): Promise<any[]> {
    return this.readJSON(config.storage.serversFile);
  }

  async saveServers(servers: any[]): Promise<void> {
    await this.writeJSON(config.storage.serversFile, servers);
  }

  async addServer(server: any): Promise<void> {
    const servers = await this.getServers();
    servers.push(server);
    await this.saveServers(servers);
  }

  async updateServer(id: string, updates: any): Promise<void> {
    const servers = await this.getServers();
    const index = servers.findIndex(s => s.id === id);
    if (index !== -1) {
      servers[index] = { ...servers[index], ...updates, updatedAt: new Date() };
      await this.saveServers(servers);
    }
  }

  async deleteServer(id: string): Promise<void> {
    const servers = await this.getServers();
    const filtered = servers.filter(s => s.id !== id);
    await this.saveServers(filtered);
  }

  // ============================================
  // BUILDS
  // ============================================
  async getBuilds(): Promise<any[]> {
    return this.readJSON(config.storage.buildsFile);
  }

  async saveBuilds(builds: any[]): Promise<void> {
    await this.writeJSON(config.storage.buildsFile, builds);
  }

  async addBuild(build: any): Promise<void> {
    const builds = await this.getBuilds();
    builds.unshift(build); // Add to beginning
    await this.saveBuilds(builds);
  }

  async updateBuild(id: string, updates: any): Promise<void> {
    const builds = await this.getBuilds();
    const index = builds.findIndex(b => b.id === id);
    if (index !== -1) {
      builds[index] = { ...builds[index], ...updates, updatedAt: new Date() };
      await this.saveBuilds(builds);
    }
  }

  async deleteBuild(id: string): Promise<void> {
    const builds = await this.getBuilds();
    const filtered = builds.filter(b => b.id !== id);
    await this.saveBuilds(filtered);
  }

  // ============================================
  // RELEASES
  // ============================================
  async getReleases(): Promise<any[]> {
    return this.readJSON(config.storage.releasesFile);
  }

  async saveReleases(releases: any[]): Promise<void> {
    await this.writeJSON(config.storage.releasesFile, releases);
  }

  async addRelease(release: any): Promise<void> {
    const releases = await this.getReleases();
    releases.unshift(release); // Add to beginning
    await this.saveReleases(releases);
  }

  async updateRelease(id: string, updates: any): Promise<void> {
    const releases = await this.getReleases();
    const index = releases.findIndex(r => r.id === id);
    if (index !== -1) {
      releases[index] = { ...releases[index], ...updates };
      await this.saveReleases(releases);
    }
  }

  async deleteRelease(id: string): Promise<void> {
    const releases = await this.getReleases();
    const filtered = releases.filter(r => r.id !== id);
    await this.saveReleases(filtered);
  }

  // ============================================
  // COMPARISONS
  // ============================================
  async getComparisons(): Promise<any[]> {
    return this.readJSON(config.storage.comparisonsFile);
  }

  async saveComparisons(comparisons: any[]): Promise<void> {
    await this.writeJSON(config.storage.comparisonsFile, comparisons);
  }

  async addComparison(comparison: any): Promise<void> {
    const comparisons = await this.getComparisons();
    comparisons.unshift(comparison); // Add to beginning

    // Keep only last 50 comparisons
    if (comparisons.length > 50) {
      comparisons.splice(50);
    }

    await this.saveComparisons(comparisons);
  }

  async deleteComparison(id: string): Promise<void> {
    const comparisons = await this.getComparisons();
    const filtered = comparisons.filter(c => c.id !== id);
    await this.saveComparisons(filtered);
  }

  // ============================================
  // RESTORES
  // ============================================
  async getRestores(): Promise<any[]> {
    return this.readJSON(config.storage.restoresFile);
  }

  async saveRestores(restores: any[]): Promise<void> {
    await this.writeJSON(config.storage.restoresFile, restores);
  }

  async addRestore(restore: any): Promise<void> {
    const restores = await this.getRestores();
    restores.unshift(restore); // Add to beginning

    // Keep only last 100 restore records
    if (restores.length > 100) {
      restores.splice(100);
    }

    await this.saveRestores(restores);
  }

  async updateRestore(id: string, updates: any): Promise<void> {
    const restores = await this.getRestores();
    const index = restores.findIndex(r => r.id === id);
    if (index !== -1) {
      restores[index] = { ...restores[index], ...updates, updatedAt: new Date() };
      await this.saveRestores(restores);
    }
  }

  async deleteRestore(id: string): Promise<void> {
    const restores = await this.getRestores();
    const filtered = restores.filter(r => r.id !== id);
    await this.saveRestores(filtered);
  }

  // ============================================
  // BACKUP HISTORY (existing functionality)
  // ============================================
  async getBackupHistory(): Promise<any[]> {
    return this.readJSON('backup-history.json');
  }

  async saveBackupHistory(history: any[]): Promise<void> {
    await this.writeJSON('backup-history.json', history);
  }

  async addBackupHistory(backup: any): Promise<void> {
    const history = await this.getBackupHistory();
    history.unshift(backup);
    await this.saveBackupHistory(history);
  }

  async deleteBackupHistory(id: string): Promise<void> {
    const history = await this.getBackupHistory();
    const filtered = history.filter(h => h.id !== id);
    await this.saveBackupHistory(filtered);
  }
}

export const storageService = new StorageService();
