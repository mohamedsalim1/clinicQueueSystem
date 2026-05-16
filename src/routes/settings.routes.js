/**
 * settings.routes.js — مسارات إعدادات النظام
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

router.get('/',  settingsController.getSettings);
router.put('/',  settingsController.updateSettings);
router.post('/', settingsController.updateSettings); // دعم كلا الطريقتين
router.get('/clinics', settingsController.getClinics);
router.post('/clinics', settingsController.createClinic);
router.put('/clinics/:clinicId', settingsController.updateClinic);
router.delete('/clinics/:clinicId', settingsController.deleteClinic);

module.exports = router;
