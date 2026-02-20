import { Router } from 'express';
import { backupController } from '../controllers/backupController.js';
import { basicAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(basicAuth);

// Test database connection
router.post('/test-connection', backupController.testConnection.bind(backupController));

// Get list of databases
router.post('/databases', backupController.getDatabases.bind(backupController));

// Create database
router.post('/create-database', backupController.createDatabase.bind(backupController));

// Drop database
router.post('/drop-database', backupController.dropDatabase.bind(backupController));

// Get database schema
router.post('/schema', backupController.getDatabaseSchema.bind(backupController));

// Execute backup
router.post('/execute', backupController.executeBackup.bind(backupController));

// Get backup history
router.get('/history', backupController.getBackupHistory.bind(backupController));

// Browse file system directories
router.get('/browse-directories', backupController.browseDirectories.bind(backupController));

// Restore database from backup
router.post('/restore', backupController.restoreBackup.bind(backupController));

// Get restore progress
router.get('/restore-progress/:restoreId', backupController.getRestoreProgress.bind(backupController));

// Execute deployment script
router.post('/execute-deployment', backupController.executeDeployment.bind(backupController));

// Rollback deployment
router.post('/rollback-deployment', backupController.rollbackDeployment.bind(backupController));

// Execute SQL query
router.post('/execute-query', backupController.executeQuery.bind(backupController));

export default router;
