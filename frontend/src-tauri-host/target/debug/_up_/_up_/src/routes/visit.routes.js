const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// الطبيب يرى التاريخ الطبي
router.get('/:patientId', authorize(['DOCTOR', 'ADMIN', 'SUPER_ADMIN']), visitController.getVisits);

// الطبيب يضيف زيارة
router.post('/', authorize(['DOCTOR', 'ADMIN', 'SUPER_ADMIN']), visitController.addVisit);

module.exports = router;