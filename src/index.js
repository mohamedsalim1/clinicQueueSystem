const http = require('http');
const config = require('./config');
const app = require('./app');
const { initIO } = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Initialize Socket.io
initIO(server);
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
server.listen(config.port, '0.0.0.0', () => {
  logger.info(`Server is running in ${config.env} mode on port ${config.port}`);
});
