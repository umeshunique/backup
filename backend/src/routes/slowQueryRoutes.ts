import { Router } from 'express';
import { basicAuth } from '../middleware/auth.js';
import { getSlowQueries } from '../controllers/slowQueryController.js';

const router = Router();
router.use(basicAuth);

router.get('/', getSlowQueries);

export default router;
