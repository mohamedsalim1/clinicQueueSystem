const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * البحث عن عائلة وأفرادها برقم الهاتف
 */
const searchFamilyByPhone = async (phone) => {
  const families = await prisma.family.findMany({
    where: { primaryPhone: { contains: phone }, deletedAt: null },
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

  return prisma.$transaction(async (tx) => {
    // 1. إنشاء العائلة
    const family = await tx.family.create({
      data: {
        familyCode: `FAM-${Date.now()}`, // توليد رمز فريد بسيط
        primaryPhone,
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

module.exports = {
  searchFamilyByPhone,
  searchPatients,
  createFamilyWithPatient,
  addPatientToFamily
};