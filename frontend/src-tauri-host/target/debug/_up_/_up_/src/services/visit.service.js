const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// جلب زيارات المريض (التاريخ الطبي)
const getPatientVisits = async (patientId) => {
  return prisma.visit.findMany({
    where: { patientId },
    orderBy: { visitDate: 'desc' },
    include: { doctor: { select: { name: true } } }
  });
};

// إنشاء زيارة جديدة مرتبطة بالتذكرة
const createVisit = async (data) => {
  const { ticketId, patientId, complaint, diagnosis, prescription, notes, doctorId, vitalsBp, vitalsPulse, vitalsTemp, examination } = data;
  
  return prisma.visit.create({
    data: {
      ticketId,
      patientId,
      createdByDoctorId: doctorId,
      complaint,
      diagnosis,
      prescription,
      notes,
      vitalsBp,
      vitalsPulse,
      vitalsTemp,
      examination,
      status: 'COMPLETED' // يمكن تغييرها لاحقاً لدعم الـ Draft
    }
  });
};

module.exports = { getPatientVisits, createVisit };