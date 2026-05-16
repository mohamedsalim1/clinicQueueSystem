const healthService = require('../services/health.service');

const checkHealth = (req, res) => {
  const status = healthService.getHealthStatus();
  res.status(200).json(status);
};

module.exports = {
  checkHealth,
};
