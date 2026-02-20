import { Request, Response } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const SCHEMA_VERSION_FILE = join(DATA_DIR, 'schema-version.json');

export interface SchemaVersionBranch {
  name: string;
  isCurrent: boolean;
  lastCommit: string;
  lastMessage: string;
}

export interface SchemaVersionCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface SchemaVersionUncommitted {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  summary: string;
}

export interface SchemaVersionState {
  repoPath: string;
  connected: boolean;
  branches: SchemaVersionBranch[];
  commits: SchemaVersionCommit[];
  uncommitted: SchemaVersionUncommitted[];
}

function connectionKey(serverId: string, database: string): string {
  return `${serverId}:${database}`;
}

const DEFAULT_STATE: SchemaVersionState = {
  repoPath: '',
  connected: false,
  branches: [],
  commits: [],
  uncommitted: [],
};

export class SchemaVersionController {
  private async readAll(): Promise<Record<string, SchemaVersionState>> {
    try {
      if (!existsSync(SCHEMA_VERSION_FILE)) {
        await mkdir(DATA_DIR, { recursive: true });
        await writeFile(SCHEMA_VERSION_FILE, JSON.stringify({}, null, 2));
        return {};
      }
      const data = await readFile(SCHEMA_VERSION_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading schema-version data:', error);
      return {};
    }
  }

  private async writeAll(state: Record<string, SchemaVersionState>): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(SCHEMA_VERSION_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * GET /api/schema-version?serverId=xxx&database=yyy
   * Returns repository and branches (and commits, uncommitted) for the connection.
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const serverId = req.query.serverId as string;
      const database = req.query.database as string;
      if (!serverId || !database) {
        res.status(400).json({
          success: false,
          message: 'Missing serverId or database query parameter',
        });
        return;
      }
      const all = await this.readAll();
      const key = connectionKey(serverId, database);
      const state = all[key] ?? { ...DEFAULT_STATE };
      res.json({
        success: true,
        data: state,
      });
    } catch (error: any) {
      console.error('Schema version get error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get schema version data',
      });
    }
  }

  /**
   * POST /api/schema-version/fetch-remote-branches
   * Body: { repoUrl [, githubToken ] }
   * Fetches branch list from a GitHub repo URL and returns branches for storage.
   */
  async fetchRemoteBranches(req: Request, res: Response): Promise<void> {
    try {
      const { repoUrl, githubToken } = req.body as { repoUrl?: string; githubToken?: string };
      if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
        res.status(400).json({
          success: false,
          message: 'Missing repoUrl in body',
        });
        return;
      }
      const url = repoUrl.trim();
      // Parse GitHub repo: https://github.com/owner/repo or https://github.com/owner/repo.git or git@github.com:owner/repo.git
      let owner: string;
      let repo: string;
      const httpsMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/i);
      const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/i);
      if (httpsMatch) {
        owner = httpsMatch[1];
        repo = httpsMatch[2];
      } else if (sshMatch) {
        owner = sshMatch[1];
        repo = sshMatch[2];
      } else {
        res.status(400).json({
          success: false,
          message: 'Only GitHub URLs are supported (e.g. https://github.com/owner/repo or git@github.com:owner/repo.git)',
        });
        return;
      }
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (githubToken && typeof githubToken === 'string' && githubToken.trim()) {
        headers.Authorization = `Bearer ${githubToken.trim()}`;
      }
      const fetchRes = await fetch(apiUrl, { headers });
      if (!fetchRes.ok) {
        const errBody = await fetchRes.text();
        let message = `GitHub API error: ${fetchRes.status}`;
        try {
          const j = JSON.parse(errBody);
          if (j.message) message = j.message;
        } catch {
          if (errBody) message = errBody.slice(0, 200);
        }
        res.status(fetchRes.status >= 500 ? 502 : 400).json({
          success: false,
          message,
        });
        return;
      }
      const data = (await fetchRes.json()) as Array<{ name: string; commit?: { sha?: string } }>;
      const defaultCurrent = (data || []).find((b) => b.name === 'main' || b.name === 'master')?.name ?? data?.[0]?.name;
      const branches: SchemaVersionBranch[] = (data || []).map((b) => ({
        name: b.name || 'branch',
        isCurrent: b.name === defaultCurrent,
        lastCommit: (b.commit && b.commit.sha) ? b.commit.sha.slice(0, 7) : '—',
        lastMessage: '',
      }));
      res.json({
        success: true,
        branches,
      });
    } catch (error: any) {
      console.error('Fetch remote branches error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch branches from remote',
      });
    }
  }

  /**
   * PUT /api/schema-version
   * Body: { serverId, database, repoPath?, connected?, branches?, commits?, uncommitted? }
   * Updates repository and/or branches for the connection.
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { serverId, database, repoPath, connected, branches, commits, uncommitted } = req.body;
      if (!serverId || !database) {
        res.status(400).json({
          success: false,
          message: 'Missing serverId or database in body',
        });
        return;
      }
      const all = await this.readAll();
      const key = connectionKey(serverId, database);
      const current: SchemaVersionState = all[key] ?? { ...DEFAULT_STATE };
      if (typeof repoPath === 'string') current.repoPath = repoPath;
      if (typeof connected === 'boolean') current.connected = connected;
      if (Array.isArray(branches)) current.branches = branches;
      if (Array.isArray(commits)) current.commits = commits;
      if (Array.isArray(uncommitted)) current.uncommitted = uncommitted;
      all[key] = current;
      await this.writeAll(all);
      res.json({
        success: true,
        data: current,
      });
    } catch (error: any) {
      console.error('Schema version update error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update schema version data',
      });
    }
  }
}

export const schemaVersionController = new SchemaVersionController();
