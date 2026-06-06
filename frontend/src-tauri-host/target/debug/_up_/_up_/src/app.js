const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');

const app = express();

// Security Middlewares
// app.use(helmet());
app.use(cors());

// Rate Limiting on API routes
// app.use('/api/', apiLimiter);

// Logging Middleware
app.use(morgan('combined', {
  stream: {
    write: message => logger.info({ event: 'http_request', message: message.trim() })
  }
}));

// Parsing Middlewares
app.use(express.json());

// Health check endpoint
const { PrismaClient } = require('@prisma/client');
const healthPrisma = new PrismaClient();
const os = require('os');

app.get('/health', async (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: 'UNKNOWN',
    lanIp: '127.0.0.1',
    env: process.env.NODE_ENV || 'production'
  };

  try {
    await healthPrisma.$queryRaw`SELECT 1`;
    status.database = 'CONNECTED';
  } catch (err) {
    status.database = 'DISCONNECTED';
    status.dbError = err.message;
  }

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          status.lanIp = iface.address;
          break;
        }
      }
    }
  } catch (err) {}

  res.status(status.database === 'CONNECTED' ? 200 : 500).json(status);
});

// Routes
app.use('/', routes);

// Serve frontend static files in Web Host Mode
const path = require('path');
const fs = require('fs');

let frontendPath = path.join(__dirname, '../frontend/dist');
if (!fs.existsSync(frontendPath)) {
  const siblingDist = path.join(__dirname, '../dist');
  if (fs.existsSync(siblingDist)) {
    frontendPath = siblingDist;
  } else {
    // For Tauri v2 resource bundling where src is under _up_/_up_/src and dist is under _up_/dist
    const tauriDist = path.join(__dirname, '../../dist');
    if (fs.existsSync(tauriDist)) {
      frontendPath = tauriDist;
    }
  }
}
const indexPath = path.join(frontendPath, 'index.html');

app.use(express.static(frontendPath));

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found. Please run npm run build in frontend directory.');
  }
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
