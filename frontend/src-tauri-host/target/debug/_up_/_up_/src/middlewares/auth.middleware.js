const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'غير مصرح، التوكن غير موجود' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // ✨ تأكد أن هذا السطر يطابق تماماً ما في auth.service.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_change_me');
    
    req.user = decoded; // إرفاق بيانات المستخدم للطلب
    next();
  } catch (error) {
    return res.status(401).json({ message: 'جلسة غير صالحة، يرجى تسجيل الدخول مجدداً' });
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