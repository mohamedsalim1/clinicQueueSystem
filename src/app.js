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
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Parsing Middlewares
app.use(express.json());

// Routes
app.use('/', routes);

// Serve frontend static files in Web Host Mode
const path = require('path');
const fs = require('fs');
const frontendPath = path.join(__dirname, '../frontend/dist');
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
