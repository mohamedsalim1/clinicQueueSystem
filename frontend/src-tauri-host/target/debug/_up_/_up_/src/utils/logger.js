const winston = require('winston');
const path = require('path');
const fs = require('fs');

const getLogDir = () => {
  const baseDir = process.env.LOG_DIR
    || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'DarayyaClinicLogs'))
    || (process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'DarayyaClinicLogs'))
    || path.join(process.cwd(), 'logs');

  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
};

const logDir = getLogDir();

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: {
    service: 'darayya-clinic-backend',
    pid: process.pid,
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const details = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${details}`;
        })
      )
    })
  ]
});

logger.logDir = logDir;

module.exports = logger;
