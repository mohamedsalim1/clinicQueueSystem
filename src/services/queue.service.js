/**
 * queue.service.js
 * منطق إدارة الدور — متوافق مع Stable Foundation v1
 * - يستخدم ENUMs للحالات
 * - يدعم ربط التذكرة بملف المريض (patientId)
 * - يدعم حالة العرض (displayState)
 */

const prisma = require('../config/prisma');

const buildFullNumber = (prefix, number) => `${prefix}-${String(number).padStart(3, '0')}`;

const enrichTicket = (ticket) => {
  if (!ticket) return null;
  const prefix = ticket.clinic?.prefix || 'X';
  return {
    ...ticket,
    fullNumber: ticket.fullNumber || buildFullNumber(prefix, ticket.number),
    clinicName: ticket.clinic?.name || 'العيادة',
    clinicNameAr: ticket.clinic?.nameAr || '',
    patientName: ticket.patient?.fullName || '',
    patientPhone: ticket.patient?.phoneOptional || ticket.patient?.family?.primaryPhone || '—',
  };
};

const sortClinics = (clinics) => {
  return [...clinics].sort((a, b) => {
    const aNum = Number(a.id);
    const bNum = Number(b.id);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
};

const mapClinicAudioKey = (audioKey, prefix = '') => {
  if (!audioKey) {
    const p = String(prefix).trim().toUpperCase();
    if (p === 'A') return 'generalInternalClinic';
    if (p === 'B') return 'babyClinic';
    if (p === 'C') return 'vaccinationClinic';
    if (p === 'D') return 'chronicDiseasesClinic';
    if (p === 'E') return 'orthopedicClinic';
    if (p === 'F') return 'womenClinic';
    if (p === 'G') return 'recoverGateClinic';
    if (p === 'H') return 'laboratory';
    if (p === 'I') return 'damadClinic';
    if (p === 'J') return 'dentalClinic';
    if (p === 'K') return 'generalSurgeryClinic';
    if (p === 'L') return 'feedClinic';
    return 'generalInternalClinic';
 }

  const key = String(audioKey).trim().toLowerCase();
  
  const map = {
    'generalinternalclinic': 'generalInternalClinic',
    'internal': 'generalInternalClinic',
    'general': 'generalInternalClinic',
    'a': 'generalInternalClinic',

    'babyclinic': 'babyClinic',
    'pediatrics': 'babyClinic',
    'b': 'babyClinic',

    'vaccinationclinic': 'vaccinationClinic',
    'vaccination': 'vaccinationClinic',
    'c': 'vaccinationClinic',

    'chronicdiseasesclinic': 'chronicDiseasesClinic',
    'chronic': 'chronicDiseasesClinic',
    'd': 'chronicDiseasesClinic',

    'orthopedicclinic': 'orthopedicClinic',
    'orthopedics': 'orthopedicClinic',
    'e': 'orthopedicClinic',

    'womenclinic': 'womenClinic',
    'gynecology': 'womenClinic',
    'f': 'womenClinic',

    'recovergateclinic': 'recoverGateClinic',
    'recovery': 'recoverGateClinic',
    'g': 'recoverGateClinic',

    'laboratory': 'laboratory',
    'lab': 'laboratory',
    'h': 'laboratory',

    'damadclinic': 'damadClinic',
    'dressing': 'damadClinic',
    'i': 'damadClinic',

    'dentalclinic': 'dentalClinic',
    'dental': 'dentalClinic',
    'j': 'dentalClinic',

    'generalsurgeryclinic': 'generalSurgeryClinic',
    'surgery': 'generalSurgeryClinic',
    'k': 'generalSurgeryClinic',

    'feedclinic': 'feedClinic',
    'nutrition': 'feedClinic',
    'l': 'feedClinic'
  };

  return map[key] || audioKey;
};

// ============================
// Queue Retrieval (Read-only)
// ============================

const getQueueByClinic = async (clinicId) => {
  const tickets = await prisma.queueTicket.findMany({
    where: { clinicId, status: 'WAITING' },
    orderBy: { number: 'asc' },
    include: { clinic: true, patient: { include: { family: true } } },
  });
  return tickets.map(enrichTicket);
};

const getCalledPatient = async (clinicId) => {
  const query = {
    where: { status: 'CALLED' },
    orderBy: { calledAt: 'desc' },
    include: { clinic: true, patient: { include: { family: true } } },
  };
  if (clinicId && clinicId !== 'all') query.where.clinicId = clinicId;
  const ticket = await prisma.queueTicket.findFirst(query);
  return ticket ? enrichTicket(ticket) : null;
};

const getAllClinicsState = async () => {
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' }
  });

  if (clinics.length === 0) return [];

  const clinicIds = clinics.map((c) => c.id);

  const allCalledRaw = await prisma.queueTicket.findMany({
    where: { clinicId: { in: clinicIds }, status: 'CALLED' },
    orderBy: { calledAt: 'desc' },
    include: { clinic: true, patient: { include: { family: true } } }
  });

  const allWaitingRaw = await prisma.queueTicket.findMany({
    where: { clinicId: { in: clinicIds }, status: 'WAITING' },
    orderBy: { number: 'asc' },
    include: { clinic: true, patient: { include: { family: true } } }
  });

  const waitingCounts = await prisma.queueTicket.groupBy({
    by: ['clinicId'],
    where: { clinicId: { in: clinicIds }, status: 'WAITING' },
    _count: { id: true }
  });
  const waitingCountMap = Object.fromEntries(
    waitingCounts.map((r) => [r.clinicId, r._count.id])
  );

  const calledMap = {};
  for (const t of allCalledRaw) {
    if (!calledMap[t.clinicId]) calledMap[t.clinicId] = t;
  }

  const waitingMap = {};
  for (const t of allWaitingRaw) {
    if (!waitingMap[t.clinicId]) waitingMap[t.clinicId] = [];
    if (waitingMap[t.clinicId].length < 5) waitingMap[t.clinicId].push(t);
  }

  return clinics.map((clinic) => ({
    clinic,
    calledTicket: calledMap[clinic.id] ? enrichTicket(calledMap[clinic.id]) : null,
    waitingTickets: (waitingMap[clinic.id] || []).map(enrichTicket),
    waitingCount: waitingCountMap[clinic.id] || 0,
  }));
};

const getClinics = async () => {
  const clinics = await prisma.clinic.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' }
  });
  return sortClinics(clinics);
};

const getClinicsForUser = async (user) => {
  if (user?.role !== 'DOCTOR') return getClinics();

  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.id },
    include: {
      clinics: {
        include: { clinic: true }
      }
    }
  });

  if (!doctor || !doctor.isActive) return [];

  const clinics = doctor.clinics
    .map((item) => item.clinic)
    .filter((clinic) => clinic && !clinic.deletedAt);

  return sortClinics(clinics);
};

const getClinicStats = async (clinicId) => {
  const [waiting, called, completed, skipped] = await Promise.all([
    prisma.queueTicket.count({ where: { clinicId, status: 'WAITING' } }),
    prisma.queueTicket.count({ where: { clinicId, status: { in: ['CALLED', 'IN_PROGRESS'] } } }),
    prisma.queueTicket.count({ where: { clinicId, status: 'COMPLETED' } }),
    prisma.queueTicket.count({ where: { clinicId, status: 'SKIPPED' } }),
  ]);
  return { waiting, called, completed, skipped, total: waiting + called + completed + skipped };
};

const getCallHistory = async (limit = 15) => {
  const tickets = await prisma.queueTicket.findMany({
    where: { status: { in: ['CALLED', 'IN_PROGRESS', 'COMPLETED'] } },
    orderBy: { calledAt: 'desc' },
    take: limit,
    include: { clinic: true, patient: { include: { family: true } } },
  });
  return tickets.map(enrichTicket);
};

// ============================
// Queue Actions (Write operations)
// ============================

const addToQueue = async ({ clinicId, patientId = null }) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingClinic = await tx.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!existingClinic) {
      throw Object.assign(new Error('العيادة غير موجودة'), { status: 404 });
    }

    if (existingClinic.deletedAt || !existingClinic.isActive) {
      throw Object.assign(new Error('هذه العيادة غير متاحة لإصدار التذاكر'), { status: 400 });
    }

    const clinic = await tx.clinic.update({
      where: { id: clinicId },
      data: { currentNumber: { increment: 1 } }
    });

    const fullNumber = buildFullNumber(clinic.prefix, clinic.currentNumber);

    const ticketData = {
      number: clinic.currentNumber,
      fullNumber,
      status: 'WAITING',
      displayState: 'IDLE',
      clinicId: clinic.id,
    };

    if (patientId) {
      ticketData.patientId = patientId;
    }

    const ticket = await tx.queueTicket.create({
      data: ticketData,
      include: { clinic: true, patient: { include: { family: true } } },
    });

    const waitingAhead = await tx.queueTicket.count({
      where: { clinicId: clinic.id, status: 'WAITING', number: { lt: ticket.number } }
    });

    return { ticket: enrichTicket(ticket), waitingAhead };
  });

  return result;
};

const nextPatient = async (clinicId, doctorId = null) => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.queueTicket.updateMany({
      where: { clinicId, status: 'CALLED' },
      data: { status: 'IN_PROGRESS', displayState: 'ARCHIVED' },
    });

    const nextTicket = await tx.queueTicket.findFirst({
      where: { clinicId, status: 'WAITING' },
      orderBy: { number: 'asc' },
      include: { clinic: true, patient: { include: { family: true } } },
    });

    if (!nextTicket) return null;

    const updated = await tx.queueTicket.update({
      where: { id: nextTicket.id },
      data: {
        status: 'CALLED',
        displayState: 'CURRENT',
        calledAt: new Date(),
        ...(doctorId ? { doctorId } : {})
      },
      include: { clinic: true, patient: { include: { family: true } } },
    });

    return enrichTicket(updated);
  });
  return result;
};

const recallCurrentPatient = async (clinicId) => {
  const current = await prisma.queueTicket.findFirst({
    where: { clinicId, status: 'CALLED' },
    orderBy: { calledAt: 'desc' },
    include: { clinic: true, patient: { include: { family: true } } },
  });

  if (!current) return null;

  const updated = await prisma.queueTicket.update({
    where: { id: current.id },
    data: {
      calledAt: new Date(),
      displayState: 'REPEAT'
    },
    include: { clinic: true, patient: { include: { family: true } } },
  });

  return enrichTicket(updated);
};

const skipPatient = async (clinicId, doctorId = null) => {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.queueTicket.findFirst({
      where: { clinicId, status: 'CALLED' },
      orderBy: { calledAt: 'desc' },
    });

    let skipped = null;
    if (current) {
      const updatedCurrent = await tx.queueTicket.update({
        where: { id: current.id },
        data: { status: 'SKIPPED', displayState: 'ARCHIVED' },
        include: { clinic: true, patient: { include: { family: true } } },
      });
      skipped = enrichTicket(updatedCurrent);
    }

    const nextTicket = await tx.queueTicket.findFirst({
      where: { clinicId, status: 'WAITING' },
      orderBy: { number: 'asc' },
    });

    let called = null;
    if (nextTicket) {
      const updatedNext = await tx.queueTicket.update({
        where: { id: nextTicket.id },
        data: {
          status: 'CALLED',
          displayState: 'CURRENT',
          calledAt: new Date(),
          ...(doctorId ? { doctorId } : {})
        },
        include: { clinic: true, patient: { include: { family: true } } },
      });
      called = enrichTicket(updatedNext);
    }

    return { skipped, called };
  });
  return result;
};

const completePatient = async (clinicId, doctorId = null) => {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.queueTicket.findFirst({
      where: { clinicId, status: { in: ['CALLED', 'IN_PROGRESS'] } },
      orderBy: { calledAt: 'desc' },
    });

    if (!current) return null;

    const updated = await tx.queueTicket.update({
      where: { id: current.id },
      data: {
        status: 'COMPLETED',
        displayState: 'ARCHIVED',
        completedAt: new Date(),
        ...(doctorId && !current.doctorId ? { doctorId } : {})
      },
      include: { clinic: true, patient: { include: { family: true } } },
    });

    return enrichTicket(updated);
  });
  return result;
};

// ✨✨✨ التعديل المطلوب: تصفير العداد بدون حذف التذاكر من الداتابيز ✨✨✨
const resetAllQueues = async () => {
  await prisma.$transaction(async (tx) => {
    // 1. إنهاء تذاكر الانتظار (تحويلها لتخطي لأنها لم تُعالج)
    await tx.queueTicket.updateMany({
      where: { status: 'WAITING' },
      data: { status: 'SKIPPED', displayState: 'ARCHIVED' }
    });

    // 2. إنهاء التذاكر قيد الاستدعاء أو المعاينة (تحويلها لمكتملة لإغلاق الحلقة)
    await tx.queueTicket.updateMany({
      where: { status: { in: ['CALLED', 'IN_PROGRESS'] } },
      data: { status: 'COMPLETED', displayState: 'ARCHIVED', completedAt: new Date() }
    });

    // 3. تصفير العداد التصاعدي لجميع العيادات فقط
    await tx.clinic.updateMany({
      data: { currentNumber: 0 }
    });
  });
};

// ============================
// Clinics CRUD
// ============================

const getNextClinicId = async (client = prisma) => {
  const clinics = await client.clinic.findMany({ select: { id: true } });
  const numericIds = clinics.map((clinic) => Number(clinic.id)).filter(Number.isFinite);
  return String((numericIds.length ? Math.max(...numericIds) : 0) + 1);
};

const validateClinicPayload = async (data = {}, currentClinicId = null) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const nameAr = typeof data.nameAr === 'string' ? data.nameAr.trim() : '';
  const prefix = typeof data.prefix === 'string' ? data.prefix.trim().toUpperCase() : '';
  const rawAudioKey = typeof data.audioKey === 'string' && data.audioKey.trim() !== '' ? data.audioKey.trim() : prefix.toLowerCase();
  const audioKey = mapClinicAudioKey(rawAudioKey, prefix);
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

  if (!name) throw Object.assign(new Error('اسم العيادة مطلوب'), { status: 400 });
  if (!prefix || !/^[A-Z]{1,3}$/.test(prefix)) throw Object.assign(new Error('بادئة العيادة يجب أن تكون أحرفاً إنجليزية فقط'), { status: 400 });

  const existing = currentClinicId
    ? await prisma.clinic.findFirst({ where: { prefix, deletedAt: null, id: { not: currentClinicId } } })
    : await prisma.clinic.findFirst({ where: { prefix, deletedAt: null } });

  if (existing) throw Object.assign(new Error('بادئة العيادة مستخدمة في عيادة أخرى'), { status: 409 });

  return { name, nameAr, prefix, audioKey, isActive };
};

const createClinic = async (data = {}) => {
  const payload = await validateClinicPayload(data);
  return prisma.$transaction(async (tx) => {
    const id = await getNextClinicId(tx);
    return tx.clinic.create({
      data: { id, name: payload.name, nameAr: payload.nameAr, prefix: payload.prefix, audioKey: payload.audioKey, currentNumber: 0, isActive: payload.isActive }
    });
  });
};

const updateClinic = async (clinicId, data = {}) => {
  const payload = await validateClinicPayload(data, clinicId);
  const existingClinic = await prisma.clinic.findFirst({ where: { id: clinicId, deletedAt: null } });
  if (!existingClinic) throw Object.assign(new Error('العيادة غير موجودة'), { status: 404 });

  return prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.update({ where: { id: clinicId }, data: { name: payload.name, nameAr: payload.nameAr, prefix: payload.prefix, audioKey: payload.audioKey, isActive: payload.isActive } });
    const tickets = await tx.queueTicket.findMany({ where: { clinicId }, select: { id: true, number: true } });
    await Promise.all(tickets.map((ticket) => tx.queueTicket.update({ where: { id: ticket.id }, data: { fullNumber: buildFullNumber(payload.prefix, ticket.number) } })));
    return clinic;
  });
};

const deleteClinic = async (clinicId) => {
  const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, deletedAt: null } });
  if (!clinic) throw Object.assign(new Error('العيادة غير موجودة'), { status: 404 });

  await prisma.clinic.update({
    where: { id: clinicId },
    data: { isActive: false, deletedAt: new Date() }
  });

  return true;
};

module.exports = {
  // Queue Actions
  addToQueue,
  nextPatient,
  recallCurrentPatient,
  skipPatient,
  completePatient,
  resetAllQueues,

  // Retrieval & Stats
  getQueueByClinic,
  getCalledPatient,
  getAllClinicsState,
  getClinicsForUser,
  getClinicStats,
  getCallHistory,

  // Clinics CRUD
  getClinics,
  createClinic,
  updateClinic,
  deleteClinic,

  // Helpers
  enrichTicket,
  buildFullNumber,
  mapClinicAudioKey,
};