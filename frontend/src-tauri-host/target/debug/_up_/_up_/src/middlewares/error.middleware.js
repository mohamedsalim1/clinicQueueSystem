const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const publicMessage = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'حدث خطأ داخلي في الخادم'
    : message;

  logger.error({
    event: 'request_error',
    name: err.name || 'Error',
    message,
    stack: err.stack || 'No stack trace',
    statusCode,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  });

  res.status(statusCode).json({
    success: false,
    message: publicMessage,
    error: {
      message: publicMessage,
    },
  });
};

module.exports = errorHandler;
