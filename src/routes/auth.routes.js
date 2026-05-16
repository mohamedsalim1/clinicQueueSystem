const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// مسار تسجيل الدخول
router.post('/login', authController.login);

module.exports = router;