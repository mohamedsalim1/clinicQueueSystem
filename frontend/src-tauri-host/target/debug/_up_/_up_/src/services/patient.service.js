const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * البحث عن عائلة وأفرادها برقم الهاتف
 */
const searchFamilyByPhoneOrName = async (query) => {
  const families = await prisma.family.findMany({
    where: { 
      deletedAt: null,
      OR: [
        { primaryPhone: { contains: query } },
        { primaryName: { contains: query, mode: 'insensitive' } },
        { patients: { some: { fullName: { contains: query, mode: 'insensitive' }, deletedAt: null } } }
      ]
    },
    include: {
      patients: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  return families;
};

/**
 * البحث عن مريض بالاسم أو رقم الملف
 */
const searchPatients = async (query) => {
  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      family: { deletedAt: null },
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { fileNumber: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: { family: true },
    take: 10
  });
  return patients;
};

/**
 * إنشاء عائلة جديدة مع مريض (رب الأسرة غالباً)
 */
const createFamilyWithPatient = async (data) => {
  const { primaryPhone, primaryName, address, patientName, gender, birthDate } = data;

  // ✨ دعم الدخول المباشر: توليد رقم هاتف مؤقت إذا لم يُعطَ
  const resolvedPhone = (primaryPhone && primaryPhone.trim())
    ? primaryPhone.trim()
    : `ANON-${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    // 1. إنشاء العائلة
    const family = await tx.family.create({
      data: {
        familyCode: `FAM-${Date.now()}`,
        primaryPhone: resolvedPhone,
        primaryName,
        address
      }
    });

    // 2. توليد رقم ملف المريض (P-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastPatient = await tx.patient.findFirst({
      where: { fileNumber: { startsWith: `P-${currentYear}-` } },
      orderBy: { fileNumber: 'desc' }
    });
    const nextNum = lastPatient ? parseInt(lastPatient.fileNumber.split('-')[2]) + 1 : 1;
    const fileNumber = `P-${currentYear}-${String(nextNum).padStart(4, '0')}`;

    // 3. فصل الاسم الأول والأب والأخير (بشكل بسيط)
    const nameParts = patientName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const fatherName = nameParts[1] || '';
    const lastName = nameParts.slice(2).join(' ') || '';

    // 4. إنشاء المريض
    const patient = await tx.patient.create({
      data: {
        fileNumber,
        firstName,
        fatherName,
        lastName,
        fullName: patientName,
        gender: gender || 'MALE',
        birthDate: birthDate ? new Date(birthDate) : null,
        relation: 'SELF', // أول مريض في العائلة هو غالباً رب الأسرة
        familyId: family.id
      }
    });

    return { family, patient };
  });
};

/**
 * إضافة مريض جديد لعائلة موجودة
 */
const addPatientToFamily = async (familyId, data) => {
  const { patientName, relation, gender, birthDate } = data;

  return prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const lastPatient = await tx.patient.findFirst({
      where: { fileNumber: { startsWith: `P-${currentYear}-` } },
      orderBy: { fileNumber: 'desc' }
    });
    const nextNum = lastPatient ? parseInt(lastPatient.fileNumber.split('-')[2]) + 1 : 1;
    const fileNumber = `P-${currentYear}-${String(nextNum).padStart(4, '0')}`;

    const nameParts = patientName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const fatherName = nameParts[1] || '';
    const lastName = nameParts.slice(2).join(' ') || '';

    const patient = await tx.patient.create({
      data: {
        fileNumber,
        firstName,
        fatherName,
        lastName,
        fullName: patientName,
        gender: gender || 'MALE',
        birthDate: birthDate ? new Date(birthDate) : null,
        relation: relation || 'OTHER',
        familyId
      }
    });

    return patient;
  });
};

/**
 * جلب جميع العائلات ومرضىها (للأدمن)
 */
const getAllFamilies = async (searchQuery = '', page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(searchQuery
      ? {
          OR: [
            { primaryPhone: { contains: searchQuery } },
            { primaryName: { contains: searchQuery, mode: 'insensitive' } },
            { patients: { some: { fullName: { contains: searchQuery, mode: 'insensitive' }, deletedAt: null } } }
          ]
        }
      : {})
  };

  const [families, totalCount] = await Promise.all([
    prisma.family.findMany({
      where,
      include: {
        patients: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.family.count({ where })
  ]);

  return { 
    families, 
    totalCount, 
    page, 
    limit, 
    totalPages: Math.ceil(totalCount / limit) 
  };
};

const updatePatient = async (patientId, data) => {
  const { fullName, relation, gender, birthDate, fileNumber } = data;
  
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const fatherName = nameParts[1] || '';
  const lastName = nameParts.slice(2).join(' ') || '';

  return prisma.patient.update({
    where: { id: patientId },
    data: {
      fullName,
      firstName,
      fatherName,
      lastName,
      relation,
      gender,
      birthDate: birthDate ? new Date(birthDate) : null,
      fileNumber
    }
  });
};

const deletePatient = async (patientId) => {
  return prisma.patient.update({
    where: { id: patientId },
    data: { deletedAt: new Date() }
  });
};

const updateFamily = async (familyId, data) => {
  const { primaryName, primaryPhone, address } = data;
  return prisma.family.update({
    where: { id: familyId },
    data: { primaryName, primaryPhone, address }
  });
};

const deleteFamily = async (familyId) => {
  return prisma.$transaction(async (tx) => {
    await tx.patient.updateMany({
      where: { familyId },
      data: { deletedAt: new Date() }
    });
    return tx.family.update({
      where: { id: familyId },
      data: { deletedAt: new Date() }
    });
  });
};

const getPatientMedicalRecord = async (patientId) => {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      family: true,
      visits: {
        orderBy: { visitDate: 'desc' },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      }
    }
  });
  if (!patient || patient.deletedAt) throw Object.assign(new Error('المريض غير موجود'), { status: 404 });
  return patient;
};

module.exports = {
  searchFamilyByPhoneOrName,
  searchPatients,
  createFamilyWithPatient,
  addPatientToFamily,
  getAllFamilies,
  updatePatient,
  deletePatient,
  updateFamily,
  deleteFamily,
  getPatientMedicalRecord
};