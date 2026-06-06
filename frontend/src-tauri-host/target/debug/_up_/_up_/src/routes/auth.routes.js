const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// مسار عام (لا يحتاج توكن)
router.post('/login', authController.login);

// ✨ مسارات محمية (تحتاج توكن)
router.use(authenticate); // كل ما يأتي بعد هذا السطر يتطلب تسجيل الدخول

router.get('/me', authController.getProfile);
router.put('/change-password', authController.changePassword);

module.exports = router;