const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// حماية كل المسارات للاستقبال والأدمن
router.use(authenticate);
router.use(authorize(['RECEPTION', 'ADMIN', 'SUPER_ADMIN']));

router.get('/search/phone', patientController.searchByPhone);
router.get('/search/query', patientController.searchByQuery);
router.post('/family', patientController.createFamilyAndPatient);
router.post('/family/member', patientController.addNewFamilyMember);

module.exports = router;