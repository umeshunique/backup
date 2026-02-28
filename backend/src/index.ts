import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import backupRoutes from './routes/backupRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import schemaVersionRoutes from './routes/schemaVersionRoutes.js';
import slowQueryRoutes from './routes/slowQueryRoutes.js';
import etlRoutes from './routes/etlRoutes.js';

const app = express();

// CORS configuration - must be before other middleware to handle preflight
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.cors.allowedOrigins;
    // In development: allow any localhost origin (different ports)
    if (config.nodeEnv === 'development' && origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    // Allow requests with no origin (e.g. Postman, curl) or from allowed list
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));

// Security middleware (after CORS so preflight passes)
app.use(helmet());

// Rate limiting - return JSON to match API response format; relaxed in development to avoid 429 during SPA mount
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.nodeEnv === 'development' ? 2000 : config.rateLimit.maxRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/servers', serverRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/schema-version', schemaVersionRoutes);
app.use('/api/slow-queries', slowQueryRoutes);
app.use('/api/etl', etlRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`✅ UData API running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔒 Authentication: Basic Auth enabled`);
  console.log(`💾 Backup storage: ${config.backup.storagePath}`);
  console.log(`📦 Data storage: ${config.storage.dataPath}`);
  console.log(`\n🚀 Server ready at http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;
