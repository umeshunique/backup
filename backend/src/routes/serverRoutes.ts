import { Router } from 'express';
import { serverController } from '../controllers/serverController.js';
import { basicAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(basicAuth);

// Get all servers
router.get('/', serverController.getAllServers.bind(serverController));

// Get server by ID
router.get('/:id', serverController.getServerById.bind(serverController));

// Create new server
router.post('/', serverController.createServer.bind(serverController));

// Update server
router.put('/:id', serverController.updateServer.bind(serverController));

// Delete server
router.delete('/:id', serverController.deleteServer.bind(serverController));

export default router;
