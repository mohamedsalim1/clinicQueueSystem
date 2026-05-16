const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

class AuthService {
  /**
   * تسجيل الدخول
   */
  async login(username, password) {
    // 1. البحث عن المستخدم
    const user = await prisma.user.findUnique({
      where: { username },
      include: { doctor: true } // جلب بيانات الطبيب إذا كان الدور طبيب
    });

    if (!user) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    // 2. التأكد أن الحساب نشط
    if (!user.isActive) {
      throw new Error('هذا الحساب معطل، يرجى مراجعة المدير');
    }

    // 3. التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    // 4. تحديث وقت آخر تسجيل دخول
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // 5. توليد الـ JWT Token
    const token = this.generateToken(user);

    // 6. إرجاع البيانات (بدون الباسورد)
    const { passwordHash, ...userData } = user;
    return {
      token,
      user: userData,
      mustChangePass: user.mustChangePass
    };
  }

  /**
   * توليد JWT Token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      role: user.role,
      doctorId: user.doctor?.id || null
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h' 
    });
  }
}

module.exports = new AuthService();