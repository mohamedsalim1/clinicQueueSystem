const path = require('path');
const fs = require('fs');

// ==========================================
// 1. تحميل ملف .env بشكل صريح من المسار الصحيح
// في بيئة Tauri على ويندوز، المسار يكون في _up_/_up_/.env
// ==========================================
const envPath = path.join(__dirname, '..', '.env');
const dotenv = require('dotenv');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error(`[Startup] ⚠️ Could not load .env from ${envPath}. Falling back to system env.`);
} else {
  console.log(`[Startup] ✅ .env loaded successfully from: ${envPath}`);
  if (process.env.DATABASE_URL) {
    console.log('[Startup] ✅ DATABASE_URL is present.');
  } else {
    console.error('[Startup] ❌ FATAL: DATABASE_URL is missing in .env!');
  }
}

// ==========================================
// 2. إخبار Prisma بمكان محرك قاعدة البيانات في بيئة ويندوز
// ==========================================
if (process.platform === 'win32' && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  // البحث في المجلد الأساسي ومجلد node_modules
  const possiblePaths = [
    path.join(__dirname, '..', 'prisma', 'query_engine-windows.dll.node'),
    path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node')
  ];
  
  let engineFound = false;
  for (const enginePath of possiblePaths) {
    if (fs.existsSync(enginePath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
      console.log(`[Startup] ✅ Prisma Engine found and set to: ${enginePath}`);
      engineFound = true;
      break;
    }
  }
  
  if (!engineFound) {
    console.warn(`[Startup] ⚠️ Prisma Engine NOT found. Relying on Prisma's internal fallback...`);
  }
}

// ==========================================
// 3. الآن نقوم بتحميل باقي المكتبات والملفات
// ==========================================
const http = require('http');
const config = require('./config');
const app = require('./app');
const { initIO } = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { mapClinicAudioKey } = require('./services/queue.service');

const autoFixAudioKeys = async () => {
  try {
    const clinics = await prisma.clinic.findMany();
    for (const clinic of clinics) {
      const correctKey = mapClinicAudioKey(clinic.audioKey, clinic.prefix);
      if (clinic.audioKey !== correctKey) {
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: { audioKey: correctKey }
        });
        logger.info(`[Auto-Fix] Updated clinic "${clinic.name}" (prefix ${clinic.prefix}) audioKey from "${clinic.audioKey}" to "${correctKey}"`);
      }
    }
  } catch (err) {
    logger.error(`[Auto-Fix] Failed to auto-correct clinic audioKeys on startup: ${err.message}\n${err.stack}`);
  }
};

const verifyDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ [Database] Connected successfully!');
  } catch (err) {
    logger.error(`❌ [Database] Connection FAILED: ${err.message}\n${err.stack}`);
    throw err;
  }
};

// Initialize Socket.io (مرة واحدة فقط)
initIO(server);

process.on('unhandledRejection', (reason) => {
  logger.error(`[Unhandled Rejection] ${reason?.message || String(reason)}\n${reason?.stack || ''}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`[Uncaught Exception] ${error.message}\n${error.stack}`);
});

// ==========================================
// تشغيل السيرفر بعد التأكد من قاعدة البيانات
// ==========================================
const startServer = async () => {
  try {
    // 1. نتأكد من الاتصال بقاعدة البيانات أولاً
    await verifyDatabaseConnection();
    
    // 2. نقوم بإصلاح مفاتيح الصوت
    await autoFixAudioKeys();

    // 3. الآن فقط نفتح المنفذ ونسمح للواجهة بالعمل
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`[Server] ✅ Started on port ${config.port} | Env: ${config.env}`);
    });

  } catch (err) {
    logger.error(`[Startup] ❌ CRITICAL: DB Connection failed. Server is running but DB is down: ${err.message}`);
    // نفتح السيرفر على أي حال لكي يظهر خطأ الـ Health في الواجهة
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`[Server] ⚠️ Started on port ${config.port} (Database Disconnected)`);
    });
  }
};

// تشغيل الدالة
startServer();