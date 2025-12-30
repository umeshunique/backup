import express from 'express';
import { StorageController } from '../controllers/storageController.js';

const router = express.Router();
const controller = new StorageController();

// ============================================
// SERVERS
// ============================================
router.get('/servers', (req, res) => controller.getServers(req, res));
router.post('/servers', (req, res) => controller.addServer(req, res));
router.put('/servers/:id', (req, res) => controller.updateServer(req, res));
router.delete('/servers/:id', (req, res) => controller.deleteServer(req, res));

// ============================================
// BUILDS
// ============================================
router.get('/builds', (req, res) => controller.getBuilds(req, res));
router.post('/builds', (req, res) => controller.addBuild(req, res));
router.put('/builds/:id', (req, res) => controller.updateBuild(req, res));
router.delete('/builds/:id', (req, res) => controller.deleteBuild(req, res));

// ============================================
// RELEASES
// ============================================
router.get('/releases', (req, res) => controller.getReleases(req, res));
router.post('/releases', (req, res) => controller.addRelease(req, res));
router.put('/releases/:id', (req, res) => controller.updateRelease(req, res));
router.delete('/releases/:id', (req, res) => controller.deleteRelease(req, res));

// ============================================
// COMPARISONS
// ============================================
router.get('/comparisons', (req, res) => controller.getComparisons(req, res));
router.post('/comparisons', (req, res) => controller.addComparison(req, res));
router.delete('/comparisons/:id', (req, res) => controller.deleteComparison(req, res));

// ============================================
// RESTORES
// ============================================
router.get('/restores', (req, res) => controller.getRestores(req, res));
router.post('/restores', (req, res) => controller.addRestore(req, res));
router.put('/restores/:id', (req, res) => controller.updateRestore(req, res));
router.delete('/restores/:id', (req, res) => controller.deleteRestore(req, res));

export default router;
