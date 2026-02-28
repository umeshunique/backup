import { Router } from 'express';
import { etlController } from '../controllers/etlController.js';
import { basicAuth } from '../middleware/auth.js';

const router = Router();
router.use(basicAuth);

router.post('/run', etlController.runEtl.bind(etlController));
router.post('/table-columns', etlController.getTableColumns.bind(etlController));
router.post('/table-relations', etlController.getTableRelations.bind(etlController));

export default router;
