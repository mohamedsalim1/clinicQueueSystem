const queueService = require('../services/queue.service');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

// ==========================================
// محرك الصوت الاحترافي (Audio Engine)
// ==========================================

// دالة تفكيك الرقم إلى مسارات صوتية (1-99 + المئات)
const getNumberAudioSequence = (num) => {
  const sequence = [];
  
  if (num >= 100) {
    const hundreds = Math.floor(num / 100) * 100; // 100, 200, 300
    sequence.push(`/audio/ar/numbers/${hundreds}.wav`);
    num = num % 100; // الباقي بعد المئة
    
    if (num > 0) {
      sequence.push('/audio/ar/phrases/and.wav'); // ملف يقول "و"
    }
  }
  
  if (num > 0) {
    sequence.push(`/audio/ar/numbers/${num}.wav`); // ملفات 1 إلى 99
  }
  
  return sequence;
};

// بناء مسارات الملفات الصوتية لتشغيلها بالتسلسل
const buildAnnouncePayload = (ticket) => {
  if (!ticket) return null;
  
  const clinicName = ticket.clinic?.name || ticket.clinicName || 'العيادة';
  
  //   دعم 10 عيادات (A إلى J)
  const prefixMap = { 
    'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e', 
    'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j' 
  };
  const rawPrefix = ticket.clinic?.prefix || 'A';
  const letterAudio = prefixMap[rawPrefix.toUpperCase()] || 'a';
  
  const rawNumber = ticket.number || parseInt(ticket.fullNumber?.split('-')[1], 10);
  
  //   استخدام audioKey بدلاً من clinicId
  const audioKey = ticket.clinic?.audioKey || 'general';

  // بناء التسلسل الصوتي (بصيغة WAV)
  const audioSequence = [
    '/audio/ar/phrases/number.wav',          // "رقم"
    `/audio/ar/letters/${letterAudio}.wav`,  // "أ", "ب", "ج"
    ...getNumberAudioSequence(rawNumber),     // "مئة" + "و" + "خمسة وثلاثون" أو "13"
    '/audio/ar/phrases/goto.wav',            // "يتوجه إلى"
    `/audio/ar/clinics/${audioKey}.wav`      // "عيادة الأسنان"
  ];

  const announceText = `رقم ${rawPrefix} ${rawNumber} يتوجه إلى ${clinicName}`;

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
    const calledTicket = await queueService.nextPatient(clinicId);
    if (!calledTicket) return res.status(404).json({ message: 'لا يوجد مرضى في قائمة الانتظار' });

    const io = getIO();
    const payload = buildAnnouncePayload(calledTicket);

    io.to(`clinic-${clinicId}`).emit('current-number', payload);
    io.to('display-global').emit('current-number', payload);

    await broadcastClinicUpdate(io, clinicId);
    res.status(200).json(calledTicket);
  } catch (error) { next(error); }
};

const recallQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const currentTicket = await queueService.recallCurrentPatient(clinicId);
    if (!currentTicket) return res.status(404).json({ message: 'لا يوجد مريض مُستدعى حالياً' });

    const io = getIO();
    const payload = buildAnnouncePayload(currentTicket);

    io.to(`clinic-${clinicId}`).emit('current-number', payload);
    io.to('display-global').emit('current-number', payload);

    res.status(200).json(currentTicket);
  } catch (error) { next(error); }
};

const skipQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const { skipped, called } = await queueService.skipPatient(clinicId);
    const io = getIO();

    if (called) {
      const payload = buildAnnouncePayload(called);
      io.to(`clinic-${clinicId}`).emit('current-number', payload);
      io.to('display-global').emit('current-number', payload);
    }

    await broadcastClinicUpdate(io, clinicId);
    res.status(200).json({ skipped, called });
  } catch (error) { next(error); }
};

const completeQueue = async (req, res, next) => {
  try {
    const { clinicId } = req.body;
    const completed = await queueService.completePatient(clinicId);
    if (!completed) return res.status(404).json({ message: 'لا يوجد مريض قيد المعاينة' });

    const io = getIO();
    await broadcastClinicUpdate(io, clinicId);

    res.status(200).json(completed);
  } catch (error) { next(error); }
};

const resetQueue = async (req, res, next) => {
  try {
    await queueService.resetAllQueues();
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
    const queue = await queueService.getQueueByClinic(clinicId);
    res.status(200).json({ tickets: queue });
  } catch (error) { next(error); }
};

const getCurrentDisplay = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    if (clinicId === 'all') {
      const allClinicsState = await queueService.getAllClinicsState();
      const history = await queueService.getCallHistory(10);
      return res.status(200).json({ allClinicsState, history });
    }
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

module.exports = {
  takeQueue, callNext, skipQueue, recallQueue, completeQueue, resetQueue,
  getQueue, getCurrentDisplay, getAllDisplay
};