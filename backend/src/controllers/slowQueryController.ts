import { Request, Response } from 'express';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { databaseService } from '../services/databaseService.js';

const DATA_DIR = './data';
const SERVERS_FILE = join(DATA_DIR, 'servers.json');

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseType: string;
  username: string;
  password: string;
}

async function readServers(): Promise<ServerConfig[]> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(SERVERS_FILE)) {
    await writeFile(SERVERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  const data = await readFile(SERVERS_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * GET /api/slow-queries?serverId=xxx&database=yyy&topN=25
 */
export async function getSlowQueries(req: Request, res: Response): Promise<void> {
  try {
    const serverId = req.query.serverId as string;
    const database = (req.query.database as string)?.trim() || null;
    const topN = Math.min(Math.max(parseInt(String(req.query.topN || 25), 10) || 25, 1), 500);

    if (!serverId) {
      res.status(400).json({
        success: false,
        message: 'Missing serverId query parameter'
      });
      return;
    }

    const servers = await readServers();
    const server = servers.find((s: ServerConfig) => s.id === serverId);
    if (!server) {
      res.status(404).json({
        success: false,
        message: 'Server not found'
      });
      return;
    }

    const result = await databaseService.getSlowQueries(
      {
        id: server.id,
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType as 'mysql' | 'mssql' | 'postgresql'
      },
      { database: database || undefined, topN }
    );

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch slow queries'
      });
      return;
    }

    res.json({
      success: true,
      queries: result.queries ?? []
    });
  } catch (error: any) {
    console.error('getSlowQueries controller error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}
