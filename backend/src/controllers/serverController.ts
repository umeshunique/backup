import { Request, Response } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = './data';
const SERVERS_FILE = join(DATA_DIR, 'servers.json');

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
      const serverData = req.body;

      const newServer: ServerConfig = {
        ...serverData,
        id: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      const updates = req.body;

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
