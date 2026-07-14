const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const getAllUsers = async () => {
  // ✨ إخفاء SUPER_ADMIN تماماً من القائمة التي تعرض للأدمن
  return prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: { id: true, username: true, name: true, role: true, isActive: true, mustChangePass: true, doctor: { select: { id: true, clinics: { select: { clinicId: true } } } } }
  });
};

const createUser = async (data, creatorRole) => {
  const { username, password, name, role, isActive, clinicIds } = data;
  
  // منع إنشاء SUPER_ADMIN من قبل ADMIN
  if (role === 'SUPER_ADMIN' && creatorRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('لا يمكنك إنشاء حساب مدير نظام'), { status: 403 });
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) throw Object.assign(new Error('اسم المستخدم موجود مسبقاً'), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, passwordHash, name, role, isActive: isActive !== undefined ? isActive : true, mustChangePass: true }
    });

    if (role === 'DOCTOR') {
      // إنشاء ملف طبيب وربطه بالعيادات المختارة
      const doctor = await tx.doctor.create({ data: { name, userId: user.id } });
      
      if (clinicIds && clinicIds.length > 0) {
        const clinicData = clinicIds.map(clinicId => ({ doctorId: doctor.id, clinicId }));
        await tx.doctorClinic.createMany({ data: clinicData });
      }
    }

    return user;
  });
};

const updateUser = async (id, data, currentUserRole) => {
  const { name, role, isActive, password, clinicIds } = data;
  
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw Object.assign(new Error('المستخدم غير موجود'), { status: 404 });

  // 🛡️ حماية SUPER_ADMIN: لا يمكن للأدمن العادي تعديله أو تعطيله
  if (targetUser.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('لا يمكنك تعديل حساب مدير النظام'), { status: 403 });
  }

  const updateData = { name, role, isActive };
  
  if (password && password.trim() !== '') {
    updateData.passwordHash = await bcrypt.hash(password, 10);
    updateData.mustChangePass = true;
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({ where: { id }, data: updateData });

    // تحديث عيادات الطبيب إذا تم إرسالها
    if (role === 'DOCTOR' && clinicIds) {
      const doctor = await tx.doctor.findUnique({ where: { userId: id } });
      if (doctor) {
        // حذف الربط القديم وإضافة الجديد
        await tx.doctorClinic.deleteMany({ where: { doctorId: doctor.id } });
        if (clinicIds.length > 0) {
          const clinicData = clinicIds.map(clinicId => ({ doctorId: doctor.id, clinicId }));
          await tx.doctorClinic.createMany({ data: clinicData });
        }
      } else if (!doctor) {
        // إذا تم ترقية مستخدم عادي إلى طبيب
        const newDoctor = await tx.doctor.create({ data: { name, userId: id } });
        if (clinicIds.length > 0) {
          const clinicData = clinicIds.map(clinicId => ({ doctorId: newDoctor.id, clinicId }));
          await tx.doctorClinic.createMany({ data: clinicData });
        }
      }
    }

    return updatedUser;
  });
};

const deleteUser = async (id, currentUserRole) => {
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw Object.assign(new Error('المستخدم غير موجود'), { status: 404 });

  // 🛡️ حماية SUPER_ADMIN من الحذف
  if (targetUser.role === 'SUPER_ADMIN') {
    throw Object.assign(new Error('لا يمكن تعطيل حساب مدير النظام'), { status: 403 });
  }

  return prisma.user.update({ where: { id }, data: { isActive: false } });
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };