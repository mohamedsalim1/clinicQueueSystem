const express = require('express');
const router = express.Router();
const queueRoutes = require('./queue.routes');
const settingsRoutes = require('./settings.routes');
const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes'); 
const visitRoutes = require('./visit.routes');
const userRoutes = require('./user.routes');
const auditRoutes = require('./audit.routes');
const reportsRoutes = require('./reports.routes');

const queueController = require('../controllers/queue.controller');

// مسار فحص الحالة (Health Check)
router.get('/health', (req, res) => res.json({ status: 'OK' }));

// مسار التحكم للأجهزة الخارجية
router.get('/deviceapi', queueController.deviceControl);

// ربط مسارات الطابور
router.use('/api/queue', queueRoutes);

// ربط مسارات الإعدادات
router.use('/api/settings', settingsRoutes);

// ربط مسارات المصادقة
router.use('/api/auth', authRoutes);

router.use('/api/patients', patientRoutes);

router.use('/api/visits', visitRoutes);

router.use('/api/users', userRoutes);

router.use('/api/audit', auditRoutes);
router.use('/api/reports', reportsRoutes);

module.exports = router;
