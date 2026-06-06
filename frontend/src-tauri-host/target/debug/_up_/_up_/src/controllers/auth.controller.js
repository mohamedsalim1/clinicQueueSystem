const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');

class AuthController {
  
  // ✨ تسجيل الدخول
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      }
      const result = await authService.login(username, password, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      await auditService.logAction({
        userId: result.user?.id,
        actionType: 'LOGIN',
        entity: 'Auth',
        entityId: result.user?.id,
        newValue: { username: result.user?.username, role: result.user?.role }
      });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // ✨ جلب بيانات المستخدم الحالي (يستخدمها الفرونت إند عند تشغيل التطبيق)
  async getProfile(req, res, next) {
    try {
      // req.user.id يأتي من الـ Middleware الخاص بالـ Token
      const user = await authService.getProfile(req.user.id);
      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  // ✨ تغيير كلمة المرور
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'يرجى إدخال كلمة المرور القديمة والجديدة' });
      }
      const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
      await auditService.logAction({
        userId: req.user.id,
        actionType: 'UPDATE',
        entity: 'UserPassword',
        entityId: req.user.id
      });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
