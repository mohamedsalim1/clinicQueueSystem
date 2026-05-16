const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      }

      const result = await authService.login(username, password);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // لاحقاً: تغيير الباسورد، تسجيل الخروج، إلخ...
}

module.exports = new AuthController();