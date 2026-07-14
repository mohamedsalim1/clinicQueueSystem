const visitService = require('../services/visit.service');
const auditService = require('../services/audit.service');
const prisma = require('../config/prisma');

const getVisits = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const visits = await visitService.getPatientVisits(patientId);
    res.status(200).json(visits);
  } catch (error) { next(error); }
};

const addVisit = async (req, res, next) => {
  try {
    const visitData = req.body;
    
    // إرفاق الـ doctorId من الـ Token (البحث عن ملف الطبيب المرتبط بالمستخدم)
    const doctorProfile = await prisma.doctor.findUnique({
      where: { userId: req.user.id }
    });
    
    visitData.doctorId = doctorProfile?.id || null;

    const visit = await visitService.createVisit(visitData);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CREATE',
      entity: 'Visit',
      entityId: visit.id,
      newValue: { patientId: visit.patientId, diagnosis: visit.diagnosis }
    });
    res.status(201).json(visit);
  } catch (error) { next(error); }
};

module.exports = { getVisits, addVisit };
