const http = require('http');
const config = require('./config');
const app = require('./app');
const { initIO } = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { mapClinicAudioKey } = require('./services/queue.service');

const autoFixAudioKeys = async () => {
  try {
    const clinics = await prisma.clinic.findMany();
    for (const clinic of clinics) {
      const correctKey = mapClinicAudioKey(clinic.audioKey, clinic.prefix);
      if (clinic.audioKey !== correctKey) {
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: { audioKey: correctKey }
        });
        logger.info(`[Auto-Fix] Updated clinic "${clinic.name}" (prefix ${clinic.prefix}) audioKey from "${clinic.audioKey}" to "${correctKey}"`);
      }
    }
  } catch (err) {
    logger.error('[Auto-Fix] Failed to auto-correct clinic audioKeys on startup:', err);
  }
};

const verifyDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info({ event: 'database_connected' });
  } catch (err) {
    logger.error({
      event: 'database_connection_failed',
      message: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

// Initialize Socket.io
initIO(server);
process.on('unhandledRejection', (reason) => {
  logger.error({
    event: 'unhandled_rejection',
    message: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

process.on('uncaughtException', (error) => {
  logger.error({
    event: 'uncaught_exception',
    message: error.message,
    stack: error.stack,
  });
});

server.listen(config.port, '0.0.0.0', async () => {
  logger.info({
    event: 'server_started',
    env: config.env,
    port: config.port,
    logDir: logger.logDir,
  });
  try {
    await verifyDatabaseConnection();
    await autoFixAudioKeys();
  } catch (err) {
    logger.error({
      event: 'startup_checks_failed',
      message: err.message,
      stack: err.stack,
    });
  }
});
