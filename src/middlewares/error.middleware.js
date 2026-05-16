const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    name: err.name || 'Error',
    message,
    stack: err.stack || 'No stack trace',
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : message,
    },
  });
};

module.exports = errorHandler;