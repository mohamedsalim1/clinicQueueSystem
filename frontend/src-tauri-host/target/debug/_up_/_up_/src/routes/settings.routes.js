/**
 * settings.routes.js — مسارات إعدادات النظام (محصنة بالصلاحيات)
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// --- مسارات الإعدادات العامة ---
// السماح للجميع برؤية الإعدادات (لشاشة العرض والطبيب وغيرهم) بدون مصادقة
router.get('/', settingsController.getSettings);

// حماية باقي المسارات: يجب تسجيل الدخول أولاً
router.use(authenticate);

// تصدير النسخة الاحتياطية لقاعدة البيانات (للأدمن فقط)
router.get('/backup', authorize(['ADMIN', 'SUPER_ADMIN']), settingsController.exportBackup);

// السماح فقط لـ (الاستقبال، الأدمن، السوبر أدمن) بتعديل الإعدادات
router.put('/', authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']), settingsController.updateSettings);
router.post('/', authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']), settingsController.updateSettings); // دعم كلا الطريقتين

// --- مسارات إدارة العيادات ---
// السماح للجميع برؤية قائمة العيادات
router.get('/clinics', settingsController.getClinics);

// السماح فقط لـ (الاستقبال، الأدمن، السوبر أدمن) بإدارة العيادات
router.post('/clinics', authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']), settingsController.createClinic);
router.put('/clinics/:clinicId', authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']), settingsController.updateClinic);


module.exports = router;