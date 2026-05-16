const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware للتحقق من المصادقة (هل المستخدم مسجل دخول؟)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'غير مصرح لك، يرجى تسجيل الدخول' });
    }

    const token = authHeader.split(' ')[1];
    
    // فك تشفير الـ Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //   نقطة أمنية مهمة: التحقق من قاعدة البيانات أن المستخدم لا يزال نشطاً
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true, mustChangePass: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'الحساب غير نشط أو تم تعطيله' });
    }

    // إرفاق بيانات المستخدم بالطلب (req) ليستخدمها الكنترولر
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'جلسة العمل منتهية، يرجى تسجيل الدخول مجدداً' });
  }
};

/**
 * Middleware للتحقق من الصلاحيات (RBAC)
 * نمرر له مصفوفة بالأدوار المسموحة
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'غير مصرح لك' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ليست لديك صلاحية للوصول إلى هذا المورد' });
    }

    next();
  };
};

module.exports = { authenticate, authorize };