const { Server } = require('socket.io');
const queueService = require('../services/queue.service');

let io;

const initIO = (server) => {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // 1. انضمام شاشة العرض
    socket.on('join-display', async () => {
      socket.join('display-global');
      console.log(`[Socket] ${socket.id} joined display-global`);
      try {
        const allClinicsState = await queueService.getAllClinicsState();
        socket.emit('all-clinics-state', allClinicsState);
      } catch (err) {
        console.error('Error sending initial display state', err);
      }
    });

    // 2. انضمام طبيب/استقبال لعيادة معينة
    socket.on('join-clinic', async (payload) => {
      // استخراج الـ clinicId بشكل آمن (سواء أرسل كنص أو ككائن)
      const clinicId = typeof payload === 'object' && payload !== null ? payload.clinicId : payload;
      
      if (!clinicId) return;

      socket.join(`clinic-${clinicId}`);
      console.log(`[Socket] ${socket.id} joined clinic-${clinicId}`);
      
      try {
        const [queue, calledTicket] = await Promise.all([
          queueService.getQueueByClinic(clinicId),
          queueService.getCalledPatient(clinicId)
        ]);
        socket.emit('queue-updated', { clinicId, queue, calledTicket });
      } catch (err) {
        console.error(`Error sending initial clinic ${clinicId} state`, err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { initIO, getIO };