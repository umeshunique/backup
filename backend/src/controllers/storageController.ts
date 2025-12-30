import { Request, Response } from 'express';
import { storageService } from '../services/storageService.js';

export class StorageController {
  // ============================================
  // SERVERS
  // ============================================
  async getServers(_req: Request, res: Response): Promise<void> {
    try {
      const servers = await storageService.getServers();
      res.json({ success: true, servers });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get servers'
      });
    }
  }

  async addServer(req: Request, res: Response): Promise<void> {
    try {
      const server = {
        ...req.body,
        id: `server-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await storageService.addServer(server);
      res.json({ success: true, server });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add server'
      });
    }
  }

  async updateServer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.updateServer(id, req.body);
      const servers = await storageService.getServers();
      const server = servers.find(s => s.id === id);
      res.json({ success: true, server });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update server'
      });
    }
  }

  async deleteServer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.deleteServer(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete server'
      });
    }
  }

  // ============================================
  // BUILDS
  // ============================================
  async getBuilds(_req: Request, res: Response): Promise<void> {
    try {
      const builds = await storageService.getBuilds();
      res.json({ success: true, builds });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get builds'
      });
    }
  }

  async addBuild(req: Request, res: Response): Promise<void> {
    try {
      const build = req.body;
      await storageService.addBuild(build);
      res.json({ success: true, build });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add build'
      });
    }
  }

  async updateBuild(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.updateBuild(id, req.body);
      const builds = await storageService.getBuilds();
      const build = builds.find(b => b.id === id);
      res.json({ success: true, build });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update build'
      });
    }
  }

  async deleteBuild(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.deleteBuild(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete build'
      });
    }
  }

  // ============================================
  // RELEASES
  // ============================================
  async getReleases(_req: Request, res: Response): Promise<void> {
    try {
      const releases = await storageService.getReleases();
      res.json({ success: true, releases });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get releases'
      });
    }
  }

  async addRelease(req: Request, res: Response): Promise<void> {
    try {
      const release = req.body;
      await storageService.addRelease(release);
      res.json({ success: true, release });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add release'
      });
    }
  }

  async updateRelease(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.updateRelease(id, req.body);
      const releases = await storageService.getReleases();
      const release = releases.find(r => r.id === id);
      res.json({ success: true, release });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update release'
      });
    }
  }

  async deleteRelease(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.deleteRelease(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete release'
      });
    }
  }

  // ============================================
  // COMPARISONS
  // ============================================
  async getComparisons(_req: Request, res: Response): Promise<void> {
    try {
      const comparisons = await storageService.getComparisons();
      res.json({ success: true, comparisons });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get comparisons'
      });
    }
  }

  async addComparison(req: Request, res: Response): Promise<void> {
    try {
      const comparison = {
        ...req.body,
        id: `comparison-${Date.now()}`,
        savedAt: new Date()
      };
      await storageService.addComparison(comparison);
      res.json({ success: true, comparison });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add comparison'
      });
    }
  }

  async deleteComparison(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.deleteComparison(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete comparison'
      });
    }
  }

  // ============================================
  // RESTORES
  // ============================================
  async getRestores(_req: Request, res: Response): Promise<void> {
    try {
      const restores = await storageService.getRestores();
      res.json({ success: true, restores });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get restores'
      });
    }
  }

  async addRestore(req: Request, res: Response): Promise<void> {
    try {
      const restore = {
        ...req.body,
        id: `restore-${Date.now()}`,
        createdAt: new Date()
      };
      await storageService.addRestore(restore);
      res.json({ success: true, restore });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add restore'
      });
    }
  }

  async updateRestore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.updateRestore(id, req.body);
      const restores = await storageService.getRestores();
      const restore = restores.find(r => r.id === id);
      res.json({ success: true, restore });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update restore'
      });
    }
  }

  async deleteRestore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await storageService.deleteRestore(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete restore'
      });
    }
  }
}
