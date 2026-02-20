import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  auth: {
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'admin',
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key-in-production',
    jwtExpiresIn: '24h'
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:8082', 'http://127.0.0.1:8082', 'http://127.0.0.1:5173'],
  },

  backup: {
    storagePath: process.env.BACKUP_STORAGE_PATH || './backups',
    maxSizeMB: parseInt(process.env.MAX_BACKUP_SIZE_MB || '1024', 10)
  },

  storage: {
    dataPath: process.env.DATA_STORAGE_PATH || './data',
    buildsFile: 'builds.json',
    releasesFile: 'releases.json',
    comparisonsFile: 'comparisons.json',
    restoresFile: 'restores.json',
    serversFile: 'servers.json'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'backup_db'
  }
};
