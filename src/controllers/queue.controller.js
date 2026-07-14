const queueService = require('../services/queue.service');
const auditService = require('../services/audit.service');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

const RECALL_SUPPRESS_MS = 7000;
const recallLocks = new Map();

const makeRecallLockKey = (clinicId, ticketId) => `${clinicId}:${ticketId}`;

const lockRecall = (key) => {
  const expiresAt = Date.now() + RECALL_SUPPRESS_MS;
  recallLocks.set(key, expiresAt);

  setTimeout(() => {
    if (recallLocks.get(key) === expiresAt) recallLocks.delete(key);
  }, RECALL_SUPPRESS_MS);
};

const isRecallLocked = (key) => {
  const expiresAt = recallLocks.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    recallLocks.delete(key);
    return false;
  }
  return true;
};

const getDoctorAccess = async (user, clinicId) => {
  if (user?.role !== 'DOCTOR') return { doctorId: null };

  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.id },
    include: { clinics: { select: { clinicId: true } } }
  });

  if (!doctor || !doctor.isActive) {
    throw Object.assign(new Error('حساب الطبيب غير مربوط بطبيب فعّال'), { status: 403 });
  }

  const requestedClinicId = String(clinicId);
  const allowedClinicIds = doctor.clinics.map((clinic) => String(clinic.clinicId));
  if (!allowedClinicIds.includes(requestedClinicId)) {
    throw Object.assign(new Error('لا يمكنك التحكم إلا بطابور عيادتك'), { status: 403 });
  }

  return { doctorId: doctor.id };
};

// ==========================================
// محرك الصوت الاحترافي (Audio Engine)
// ==========================================

// دالة تفكيك الرقم إلى مسارات صوتية (1-99 + المئات)
const getNumberAudioSequence = (num) => {
  const sequence = [];

  if (num >= 100) {
    const hundreds = Math.floor(num / 100) * 100; // 100, 200, 300
    sequence.push(`/audio/numbers/${hundreds}.wav`);
    num = num % 100; // الباقي بعد المئة

    if (num > 0) {
      sequence.push('/audio/phrases/and.wav'); // ملف يقول "و"
    }
  }

  if (num > 0) {
    sequence.push(`/audio/numbers/${num}.wav`); // ملفات 1 إلى 99
  }

  return sequence;
};

// بناء مسارات الملفات الصوتية لتشغيلها بالتسلسل
//
// التسلسل: number.wav → حرف (Uppercase) → أجزاء الرقم (+ and.wav للمئات) → ملف العيادة
// مثال "D-35 → عيادة الأمراض المزمنة":
//   number.wav → D.wav → 35.wav → chronic.wav
// مثال "D-135":
//   number.wav → D.wav → 100.wav → and.wav → 35.wav → chronic.wav
//
// ملاحظة: لا يوجد goto.wav — عبارة "يتوجه إلى" مدمجة داخل كل ملف عيادة.
// ملاحظة: الأحرف بـ Uppercase لأن Linux حساسة لحالة الأحرف (D.wav ≠ d.wav).
// دالة لحل أسماء الملفات الصوتية للعيادات بدقة مع مراعاة حالة الأحرف (Case Sensitivity) على Linux
const resolveClinicAudioFile = (audioKey) => {
  if (!audioKey) return 'generalInternalClinic';

  const key = audioKey.trim().toLowerCase();

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

const buildAnnouncePayload = (ticket) => {
  if (!ticket) return null;

  const clinicName = ticket.clinic?.name || ticket.clinicName || 'العيادة';

  // الحرف بـ Uppercase ليطابق أسماء الملفات: A.wav, B.wav, C.wav ...
  // مهم على Linux: الملفات باسم A.wav وليس a.wav
  const rawPrefix = (ticket.clinic?.prefix || 'A').toUpperCase();

  const rawNumber = ticket.number
    || parseInt(ticket.fullNumber?.split('-')[1], 10)
    || 0;

  // audioKey يطابق اسم الملف بدون الامتداد داخل /audio/clinics/
  const rawAudioKey = ticket.clinic?.audioKey || 'general';
  const audioKey = resolveClinicAudioFile(rawAudioKey);

  // التسلسل الصوتي النهائي
  const audioSequence = [
    '/audio/phrases/number.wav',          // "رقم"
    `/audio/letters/${rawPrefix}.wav`,    // "D" (إنجليزي، Uppercase)
    ...getNumberAudioSequence(rawNumber), // "35" أو "100 و 35"
    `/audio/clinics/${audioKey}.wav`,     // "يتوجه إلى عيادة الأمراض المزمنة"
  ];

  const announceText = `رقم ${rawPrefix}${rawNumber} — ${clinicName}`;

  return { ...ticket, announceText, audioSequence };
};


// ============================
// مساعدة: بث تحديث شامل (Single Source of Truth)
// ============================
const broadcastClinicUpdate = async (io, clinicId) => {
  try {
    const [waitingQueue, calledTicket, allClinicsState] = await Promise.all([
      queueService.getQueueByClinic(clinicId),
      queueService.getCalledPatient(clinicId),
      queueService.getAllClinicsState(),
    ]);

    io.to(`clinic-${clinicId}`).emit('queue-updated', { clinicId, queue: waitingQueue, calledTicket });
    io.to('display-global').emit('all-clinics-state', allClinicsState);
  } catch (error) {
    logger.error('Broadcast error:', error);
  }
};

// ============================
// Controller Actions (POST)
// ============================

const takeQueue = async (req, res, next) => {
  try {
    //   تم تعديل المدخلات لتقبل patientId بدل بيانات المريض النصية
    const { clinicId, patientId } = req.body;
    const { ticket, waitingAhead } = await queueService.addToQueue({ clinicId, patientId: patientId || null });
    const io = getIO();
    await broadcastClinicUpdate(io, clinicId);
    res.status(201).json({ ticket, waitingAhead });
  } catch (error) { next(error); }
};

const callNext = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const { doctorId } = await getDoctorAccess(req.user, clinicId);
    const calledTicket = await queueService.nextPatient(clinicId, doctorId);
    if (!calledTicket) return res.status(404).json({ message: 'لا يوجد مرضى في قائمة الانتظار' });

    const io = getIO();
    const payload = buildAnnouncePayload(calledTicket);

    io.to(`clinic-${clinicId}`).emit('current-number', payload);
    io.to('display-global').emit('current-number', payload);

    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CALL',
      entity: 'QueueTicket',
      entityId: calledTicket.id,
      newValue: { action: 'NEXT', fullNumber: calledTicket.fullNumber, clinicId }
    });

    await broadcastClinicUpdate(io, clinicId);
    res.status(200).json(calledTicket);
  } catch (error) { next(error); }
};

const recallQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    await getDoctorAccess(req.user, clinicId);
    const calledTicket = await queueService.getCalledPatient(clinicId);
    if (!calledTicket) return res.status(404).json({ message: 'لا يوجد مريض مُستدعى حالياً' });

    const recallKey = makeRecallLockKey(clinicId, calledTicket.id);
    if (isRecallLocked(recallKey)) {
      return res.status(202).json({
        ...calledTicket,
        ignored: true,
        message: 'إعادة النداء قيد التنفيذ، تم تجاهل الطلب المكرر'
      });
    }

    lockRecall(recallKey);
    const currentTicket = await queueService.recallCurrentPatient(clinicId);
    if (!currentTicket) {
      recallLocks.delete(recallKey);
      return res.status(404).json({ message: 'لا يوجد مريض مُستدعى حالياً' });
    }

    const io = getIO();
    const payload = buildAnnouncePayload(currentTicket);

    io.to(`clinic-${clinicId}`).emit('current-number', payload);
    io.to('display-global').emit('current-number', payload);

    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CALL',
      entity: 'QueueTicket',
      entityId: currentTicket.id,
      newValue: { action: 'RECALL', fullNumber: currentTicket.fullNumber, clinicId }
    });

    res.status(200).json(currentTicket);
  } catch (error) { next(error); }
};

const skipQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const { doctorId } = await getDoctorAccess(req.user, clinicId);
    const { skipped, called } = await queueService.skipPatient(clinicId, doctorId);
    const io = getIO();

    if (called) {
      const payload = buildAnnouncePayload(called);
      io.to(`clinic-${clinicId}`).emit('current-number', payload);
      io.to('display-global').emit('current-number', payload);
      await auditService.logAction({
        userId: req.user?.id,
        actionType: 'CALL',
        entity: 'QueueTicket',
        entityId: called.id,
        newValue: { action: 'SKIP_AND_CALL_NEXT', fullNumber: called.fullNumber, clinicId }
      });
    }

    await broadcastClinicUpdate(io, clinicId);
    res.status(200).json({ skipped, called });
  } catch (error) { next(error); }
};

const completeQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const { doctorId } = await getDoctorAccess(req.user, clinicId);
    const completed = await queueService.completePatient(clinicId, doctorId);
    if (!completed) return res.status(404).json({ message: 'لا يوجد مريض قيد المعاينة' });

    const io = getIO();
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'UPDATE',
      entity: 'QueueTicket',
      entityId: completed.id,
      newValue: { action: 'COMPLETE', fullNumber: completed.fullNumber, clinicId }
    });
    await broadcastClinicUpdate(io, clinicId);

    res.status(200).json(completed);
  } catch (error) { next(error); }
};

const resetQueue = async (req, res, next) => {
  try {
    await queueService.resetAllQueues();
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'DELETE',
      entity: 'QueueTicket',
      newValue: { action: 'RESET_ALL_QUEUES' }
    });
    const io = getIO();
    const allClinicsState = await queueService.getAllClinicsState();

    io.emit('all-clinics-state', allClinicsState);
    io.emit('queue-reset', { message: 'تم إعادة ضبط جميع الطوابير' });
    io.emit('current-number', null);

    res.status(200).json({ message: 'تم إعادة ضبط جميع الطوابير بنجاح' });
  } catch (error) { next(error); }
};

// ============================
// Controller Actions (GET)
// ============================

const getQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    await getDoctorAccess(req.user, clinicId);
    const queue = await queueService.getQueueByClinic(clinicId);
    res.status(200).json({ tickets: queue });
  } catch (error) { next(error); }
};

const getCurrentDisplay = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    if (clinicId === 'all') {
      if (req.user?.role === 'DOCTOR') {
        return res.status(403).json({ message: 'لا يمكنك عرض كل العيادات من حساب الطبيب' });
      }
      const allClinicsState = await queueService.getAllClinicsState();
      const history = await queueService.getCallHistory(10);
      return res.status(200).json({ allClinicsState, history });
    }
    await getDoctorAccess(req.user, clinicId);
    const [currentTicket, tickets, stats] = await Promise.all([
      queueService.getCalledPatient(clinicId),
      queueService.getQueueByClinic(clinicId),
      queueService.getClinicStats(clinicId),
    ]);
    res.status(200).json({ currentTicket, tickets, stats });
  } catch (error) { next(error); }
};

const getAllDisplay = async (req, res, next) => {
  try {
    const allClinicsState = await queueService.getAllClinicsState();
    const history = await queueService.getCallHistory(10);
    res.status(200).json({ allClinicsState, history });
  } catch (error) { next(error); }
};

const deviceControl = async (req, res, next) => {
  try {
    const clinicId = String(req.headers.id || req.query.id || '').trim();
    const cmd = String(req.headers.cmd || req.query.cmd || '').trim().toLowerCase();

    if (!clinicId) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('000');
    }

    if (cmd !== 'call' && cmd !== 'recall') {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('000');
    }

    // Check if clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });
    if (!clinic) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(404).send('000');
    }

    if (cmd === 'call') {
      // check if there is a next waiting ticket
      const nextTicket = await prisma.queueTicket.findFirst({
        where: { clinicId, status: 'WAITING' }
      });

      if (nextTicket) {
        // call the next patient
        const calledTicket = await queueService.nextPatient(clinicId, null);
        if (calledTicket) {
          const io = getIO();
          const payload = buildAnnouncePayload(calledTicket);

          io.to(`clinic-${clinicId}`).emit('current-number', payload);
          io.to('display-global').emit('current-number', payload);

          await auditService.logAction({
            userId: null,
            actionType: 'CALL',
            entity: 'QueueTicket',
            entityId: calledTicket.id,
            newValue: { action: 'DEVICE_CALL', fullNumber: calledTicket.fullNumber, clinicId }
          });

          await broadcastClinicUpdate(io, clinicId);
        }
      }
    } else if (cmd === 'recall') {
      const calledTicket = await queueService.getCalledPatient(clinicId);
      if (calledTicket) {
        const recallKey = makeRecallLockKey(clinicId, calledTicket.id);
        if (!isRecallLocked(recallKey)) {
          lockRecall(recallKey);
          const currentTicket = await queueService.recallCurrentPatient(clinicId);
          if (currentTicket) {
            const io = getIO();
            const payload = buildAnnouncePayload(currentTicket);

            io.to(`clinic-${clinicId}`).emit('current-number', payload);
            io.to('display-global').emit('current-number', payload);

            await auditService.logAction({
              userId: null,
              actionType: 'CALL',
              entity: 'QueueTicket',
              entityId: currentTicket.id,
              newValue: { action: 'DEVICE_RECALL', fullNumber: currentTicket.fullNumber, clinicId }
            });
          }
        }
      }
    }

    // Return the current patient number padded to 3 digits (or 000 if none)
    const currentCalled = await queueService.getCalledPatient(clinicId);
    const resultNum = currentCalled ? String(currentCalled.number).padStart(3, '0') : '000';
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(resultNum);
  } catch (error) {
    logger.error('Error in deviceControl:', error);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('000');
  }
};

module.exports = {
  takeQueue, callNext, skipQueue, recallQueue, completeQueue, resetQueue,
  getQueue, getCurrentDisplay, getAllDisplay, deviceControl
};
