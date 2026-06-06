const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// حماية كل المسارات للأدمن والسوبر أدمن فقط
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

router.get('/summary', reportsController.getSummaryReport);
router.get('/audit', reportsController.getAuditLogsReport);
router.get('/operational', reportsController.getOperationalHealth);
router.get('/export', reportsController.exportReportsExcel);

module.exports = router;
