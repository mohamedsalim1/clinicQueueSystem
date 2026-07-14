const prisma = require('../config/prisma');

/**
 * تسجيل إجراء في سجل المراجعة
 * @param {Object} logData - { userId, actionType, entity, entityId, oldValue, newValue }
 */
const logAction = async (logData) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: logData.userId || null,
        actionType: logData.actionType,
        entity: logData.entity,
        entityId: logData.entityId || null,
        oldValue: logData.oldValue || undefined,
        newValue: logData.newValue || undefined,
      }
    });
  } catch (error) {
    console.error('Failed to log action:', error);
    // لا نريد أن يفشل النظام بأكمله إذا فشل التسجيل
  }
};

/**
 * جلب سجل المراجعة مع فلتر
 */
const getLogs = async (filters = {}) => {
  const where = {};
  if (filters.entity) where.entity = filters.entity;
  if (filters.userId) where.userId = filters.userId;
  if (filters.actionType) where.actionType = filters.actionType;

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100, // أحدث 100 سجل
    include: { user: { select: { name: true, username: true } } }
  });
};

module.exports = { logAction, getLogs };