const express = require('express');
const router = express.Router();
const queueRoutes = require('./queue.routes');
const settingsRoutes = require('./settings.routes');
const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes'); 

// مسار فحص الحالة (Health Check)
router.get('/health', (req, res) => res.json({ status: 'OK' }));

// ربط مسارات الطابور
router.use('/api/queue', queueRoutes);

// ربط مسارات الإعدادات
router.use('/api/settings', settingsRoutes);

// ربط مسارات المصادقة
router.use('/api/auth', authRoutes);

router.use('/api/patients', patientRoutes);

module.exports = router;
