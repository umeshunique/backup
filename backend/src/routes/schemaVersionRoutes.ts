import { Router } from 'express';
import { schemaVersionController } from '../controllers/schemaVersionController.js';
import { basicAuth } from '../middleware/auth.js';

const router = Router();

router.use(basicAuth);

// Get repository and branches for a connection (query: serverId, database)
router.get('/', schemaVersionController.get.bind(schemaVersionController));

// Fetch branches from a GitHub repo URL (body: repoUrl, githubToken?)
router.post('/fetch-remote-branches', schemaVersionController.fetchRemoteBranches.bind(schemaVersionController));

// Update repository and/or branches for a connection (body: serverId, database, repoPath?, connected?, branches?, commits?, uncommitted?)
router.put('/', schemaVersionController.update.bind(schemaVersionController));

export default router;
