import { Request, Response } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { config } from '../config/env.js';

const DATA_DIR = join(process.cwd(), config.storage.dataPath);
const SERVERS_FILE = join(DATA_DIR, config.storage.serversFile);

interface ServerConfig {
  id: string;
  name: string;
  environment: string;
  host: string;
  port: number;
  databaseType: string;
  username: string;
  password: string;
  isActive: boolean;
  connectionStatus: string;
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
}

export class ServerController {
  /**
   * Initialize data directory and file
   */
  private async ensureDataFile() {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    if (!existsSync(SERVERS_FILE)) {
      await writeFile(SERVERS_FILE, JSON.stringify([], null, 2));
    }
  }

  /**
   * Read servers from file
   */
  private async readServers(): Promise<ServerConfig[]> {
    await this.ensureDataFile();
    const data = await readFile(SERVERS_FILE, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Write servers to file
   */
  private async writeServers(servers: ServerConfig[]): Promise<void> {
    await this.ensureDataFile();
    await writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2));
  }

  /**
   * Get all servers
   */
  async getAllServers(_req: Request, res: Response) {
    try {
      const servers = await this.readServers();
      res.json({
        success: true,
        servers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get servers'
      });
    }
  }

  /**
   * Get server by ID
   */
  async getServerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servers = await this.readServers();
      const server = servers.find(s => s.id === id);

      if (!server) {
        res.status(404).json({
          success: false,
          message: 'Server not found'
        });
        return;
      }

      res.json({
        success: true,
        server
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get server'
      });
    }
  }

  /**
   * Create new server
   */
  async createServer(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const host = typeof body.host === 'string' ? body.host.trim() : '';
      const port = typeof body.port === 'number' ? body.port : Number(body.port);
      const databaseType = typeof body.databaseType === 'string' ? body.databaseType : 'mysql';
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const environment = typeof body.environment === 'string' ? body.environment : 'development';
      const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

      if (!name || name.length < 2) {
        res.status(400).json({ success: false, message: 'Server name is required (at least 2 characters).' });
        return;
      }
      if (!host) {
        res.status(400).json({ success: false, message: 'Host is required.' });
        return;
      }
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        res.status(400).json({ success: false, message: 'Port must be an integer between 1 and 65535.' });
        return;
      }
      if (!username) {
        res.status(400).json({ success: false, message: 'Username is required.' });
        return;
      }
      if (password === undefined || password === null) {
        res.status(400).json({ success: false, message: 'Password is required.' });
        return;
      }

      const validEnvs = ['development', 'staging', 'uat', 'production', 'dr'];
      const validTypes = ['mysql', 'mssql', 'postgresql'];
      const env = validEnvs.includes(environment) ? environment : 'development';
      const dbType = validTypes.includes(databaseType) ? databaseType : 'mysql';

      const newServer: ServerConfig = {
        id: `server_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name,
        environment: env,
        host,
        port: Number(port),
        databaseType: dbType,
        username,
        password: String(password),
        isActive,
        connectionStatus: 'disconnected',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const servers = await this.readServers();
      servers.push(newServer);
      await this.writeServers(servers);

      res.status(201).json({
        success: true,
        message: 'Server created successfully',
        server: newServer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create server'
      });
    }
  }

  /**
   * Update server
   */
  async updateServer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Don't overwrite password with empty or placeholder (keep existing)
      if (updates.password === '' || updates.password === '********') {
        delete updates.password;
      }

      const servers = await this.readServers();
      const serverIndex = servers.findIndex(s => s.id === id);

      if (serverIndex === -1) {
        res.status(404).json({
          success: false,
          message: 'Server not found'
        });
        return;
      }

      servers[serverIndex] = {
        ...servers[serverIndex],
        ...updates,
        id, // Don't allow ID to be changed
        updatedAt: new Date().toISOString()
      };

      await this.writeServers(servers);

      res.json({
        success: true,
        message: 'Server updated successfully',
        server: servers[serverIndex]
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update server'
      });
    }
  }

  /**
   * Delete server
   */
  async deleteServer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servers = await this.readServers();
      const filteredServers = servers.filter(s => s.id !== id);

      if (servers.length === filteredServers.length) {
        res.status(404).json({
          success: false,
          message: 'Server not found'
        });
        return;
      }

      await this.writeServers(filteredServers);

      res.json({
        success: true,
        message: 'Server deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete server'
      });
    }
  }
}

export const serverController = new ServerController();
