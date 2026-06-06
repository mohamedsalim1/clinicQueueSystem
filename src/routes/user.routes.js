const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// حماية كل المسارات للأدمن والسوبر أدمن فقط
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;