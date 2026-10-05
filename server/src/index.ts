import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { checkAndUpdateSlaBreaches } from './utils/sla.js';

// Import Routes
import authRoutes from './routes/auth.routes.js';
import complaintsRoutes from './routes/complaints.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import constituenciesRoutes from './routes/constituencies.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();

// Ensure upload folder exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'JanSankalp API Gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/departments', departmentsRoutes);
app.use('/api/v1/constituencies', constituenciesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/public', publicRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Start SLA breach background monitoring
setInterval(() => {
  try {
    const breachedCount = checkAndUpdateSlaBreaches();
    if (breachedCount > 0) {
      console.log(`[SLA Monitor] Detected and flagged ${breachedCount} breached complaints`);
    }
  } catch (err) {
    console.error('[SLA Monitor] Error running periodic check:', err);
  }
}, 60 * 1000); // Check every minute

// Start Server
app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🇮🇳 JanSankalp Public Grievance API Server`);
  console.log(`🚀 Live on http://localhost:${config.PORT}`);
  console.log(`📁 Upload directory: ${config.UPLOAD_DIR}`);
  console.log(`=======================================================`);
});
