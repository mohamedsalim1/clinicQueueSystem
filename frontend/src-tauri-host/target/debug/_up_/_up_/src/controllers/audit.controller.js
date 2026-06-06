const auditService = require('../services/audit.service');

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditService.getLogs(req.query);
    res.status(200).json(logs);
  } catch (error) { next(error); }
};

module.exports = { getAuditLogs };