const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

router.get('/', auditController.getAuditLogs);

module.exports = router;