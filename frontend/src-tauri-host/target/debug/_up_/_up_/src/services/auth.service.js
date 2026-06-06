const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthService {
  
  // ✨ تسجيل الدخول
  async login(username, password, context = {}) {
    const normalizedUsername = String(username || '').trim();

    logger.info({
      event: 'auth_login_attempt',
      username: normalizedUsername,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      include: {
        // ✨ جلب عيادات الطبيب إذا كان دوره DOCTOR
        doctor: {
          include: {
            clinics: {
              select: { clinicId: true }
            }
          }
        }
      }
    });

    if (!user) {
      logger.warn({
        event: 'auth_login_failed',
        reason: 'user_not_found',
        username: normalizedUsername,
        ip: context.ip,
      });
      throw Object.assign(new Error('اسم المستخدم أو كلمة المرور غير صحيحة'), { status: 401 });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn({
        event: 'auth_login_failed',
        reason: 'bad_password',
        userId: user.id,
        username: normalizedUsername,
        role: user.role,
        ip: context.ip,
      });
      throw Object.assign(new Error('اسم المستخدم أو كلمة المرور غير صحيحة'), { status: 401 });
    }
    if (!user.isActive) {
      logger.warn({
        event: 'auth_login_failed',
        reason: 'inactive_user',
        userId: user.id,
        username: normalizedUsername,
        role: user.role,
        ip: context.ip,
      });
      throw Object.assign(new Error('هذا الحساب معطل، تواصل مع الإدارة'), { status: 403 });
    }

    // تحديث وقت آخر تسجيل دخول
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = this.generateToken(user);

    logger.info({
      event: 'auth_login_success',
      userId: user.id,
      username: normalizedUsername,
      role: user.role,
      ip: context.ip,
    });

    return { token, user };
  }

  // ✨ جلب بيانات المستخدم الحالي (لتحميلها عند عمل Refresh للصفحة)
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctor: {
          include: {
            clinics: {
              select: { clinicId: true }
            }
          }
        }
      }
    });

    if (!user) throw Object.assign(new Error('المستخدم غير موجود'), { status: 404 });
    return user;
  }

  // ✨ تغيير كلمة المرور
  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('المستخدم غير موجود'), { status: 404 });

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw Object.assign(new Error('كلمة المرور القديمة غير صحيحة'), { status: 400 });

    if (newPassword.length < 6) throw Object.assign(new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'), { status: 400 });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newHash, 
        mustChangePass: false // إلغاء إلزامية التغيير بعد أول تعديل
      }
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  // توليد الـ JWT
  generateToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'super_secret_key_change_me',
      { expiresIn: '7d' }
    );
  }
}

module.exports = new AuthService();
