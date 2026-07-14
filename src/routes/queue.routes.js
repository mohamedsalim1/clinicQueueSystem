/**
 * queue.routes.js — مسارات الطابور مع التحقق من المدخلات والصلاحيات
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const queueController = require('../controllers/queue.controller');
const { validateRequest } = require('../middlewares/validation.middleware');

//   استدعاء حراس الأمان
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ——— التحقق من المدخلات (Validation) ———
const clinicIdBodyValidator = [
  body('clinicId').isString().notEmpty().withMessage('clinicId مطلوب'),
  validateRequest
];

const clinicIdParamValidator = [
  param('clinicId').isString().notEmpty().withMessage('clinicId مطلوب'),
  validateRequest
];

// بيانات المريض (مؤقتاً حتى نبني نظام المرضى)
const patientValidator = [
  body('clinicId').isString().notEmpty().withMessage('clinicId مطلوب'),
  body('patientId').optional().isString(), //   استبدال الأسماء بالـ ID
  validateRequest
];


// ——— GET (جلب البيانات العامة) ———
// جلب بيانات الشاشة: عامة بدون مصادقة لتسهيل عرض التلفزيون
router.get('/display/all', queueController.getAllDisplay);

router.use(authenticate);

// ——— POST (إجراءات الطابور) ———

// إصدار دور: الاستقبال والأدمن
router.post('/take', authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']), patientValidator, queueController.takeQueue);

// استدعاء التالي: الاستقبال والطبيب والأدمن
router.post('/next', authorize(['RECEPTION', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdBodyValidator, queueController.callNext);

// تخطي المريض: الاستقبال والطبيب والأدمن
router.post('/skip', authorize(['RECEPTION', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdBodyValidator, queueController.skipQueue);

// إعادة النداء: الاستقبال والطبيب والأدمن
router.post('/recall', authorize(['RECEPTION', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdBodyValidator, queueController.recallQueue);

// إتمام الزيارة: الطبيب والأدمن فقط (لأنها عملية طبية)
router.post('/complete', authorize(['DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdBodyValidator, queueController.completeQueue);

// إعادة ضبط الطوابير: الأدمن فقط (عملية خطيرة)
router.post('/reset', authorize(['ADMIN', 'SUPER_ADMIN', 'RECEPTION']), queueController.resetQueue);

// ——— GET (جلب البيانات) ———

// جلب بيانات الشاشة: تم نقله للأعلى ليكون عاماً

// جلب بيانات العيادة الحالية (لوحة الطبيب والاستقبال)
router.get('/current/:clinicId', authorize(['RECEPTION', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdParamValidator, queueController.getCurrentDisplay);

// جلب قائمة انتظار عيادة معينة
router.get('/:clinicId', authorize(['RECEPTION', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']), clinicIdParamValidator, queueController.getQueue);


module.exports = router;