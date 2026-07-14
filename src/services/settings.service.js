/**
 * settings.service.js — خدمة إعدادات النظام وتصدير واستعادة النسخ الاحتياطية
 */

const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const DEFAULTS = {
  tickerText:    'مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل',
  clinicTitle:   'مركز داريا الطبي',
  clinicSubtitle:'Daraya Medical Center',
  footerMsg:     'يرجى انتظار ظهور رقمك على شاشة العرض',
  printerName:   'Thermal_Printer',
};

const getSettings = async () => {
  try {
    const settingsRows = await prisma.systemSetting.findMany();
    if (settingsRows.length === 0) {
      for (const [key, value] of Object.entries(DEFAULTS)) {
        await prisma.systemSetting.create({ data: { key, value } });
      }
      return DEFAULTS;
    }
    
    const settings = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }
    return { ...DEFAULTS, ...settings };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULTS;
  }
};

const updateSettings = async (data) => {
  const allowed = ['tickerText', 'clinicTitle', 'clinicSubtitle', 'footerMsg', 'printerName'];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );

  for (const [key, value] of Object.entries(filtered)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  
  return await getSettings();
};

const modelNameToDelegate = (name) => name.charAt(0).toLowerCase() + name.slice(1);

const exportBackup = async () => {
  const models = Prisma.dmmf.datamodel.models
    .map((model) => ({ name: model.name, delegate: modelNameToDelegate(model.name) }))
    .filter(({ delegate }) => prisma[delegate] && typeof prisma[delegate].findMany === 'function');

  const entries = await Promise.all(
    models.map(async ({ name, delegate }) => {
      const rows = await prisma[delegate].findMany();
      return [name, rows];
    })
  );

  const data = Object.fromEntries(entries);
  const recordCounts = Object.fromEntries(entries.map(([name, rows]) => [name, rows.length]));

  return {
    backupDate: new Date().toISOString(),
    version: '1.0',
    databaseProvider: 'postgresql',
    modelCount: models.length,
    recordCounts,
    data
  };
};

const restoreBackup = async (backup) => {
  if (!backup || !backup.data || backup.databaseProvider !== 'postgresql') {
    throw Object.assign(new Error('ملف النسخة الاحتياطية غير صالح أو غير متوافق'), { status: 400 });
  }

  // ترتيب حذف ومسح الجداول لضمان عدم انتهاك قيود المفاتيح الأجنبية
  const tableNames = [
    'AuditLog',
    'AnnouncementHistory',
    'MedicalDictionary',
    'DailyQueueCounter',
    'QueueTicket',
    'Visit',
    'DoctorClinic',
    'Doctor',
    'Clinic',
    'Patient',
    'Family',
    'User',
    'SystemSetting'
  ];

  await prisma.$transaction(async (tx) => {
    // 1. مسح كافة البيانات من الجداول الحالية بشكل تسلسلي آمن
    for (const table of tableNames) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }

    // 2. كتابة البيانات بالترتيب الصحيح للعلاقات
    const order = [
      { model: 'SystemSetting', delegate: 'systemSetting' },
      { model: 'User', delegate: 'user' },
      { model: 'Family', delegate: 'family' },
      { model: 'Patient', delegate: 'patient' },
      { model: 'Clinic', delegate: 'clinic' },
      { model: 'Doctor', delegate: 'doctor' },
      { model: 'DoctorClinic', delegate: 'doctorClinic' },
      { model: 'Visit', delegate: 'visit' },
      { model: 'QueueTicket', delegate: 'queueTicket' },
      { model: 'AnnouncementHistory', delegate: 'announcementHistory' },
      { model: 'DailyQueueCounter', delegate: 'dailyQueueCounter' },
      { model: 'MedicalDictionary', delegate: 'medicalDictionary' },
      { model: 'AuditLog', delegate: 'auditLog' }
    ];

    for (const { model, delegate } of order) {
      const rows = backup.data[model];
      if (rows && rows.length > 0) {
        // تحويل سلاسل نصوص التواريخ المخزنة بالـ JSON إلى كائنات Date لتقبلها قاعدة البيانات
        const formattedRows = rows.map(row => {
          const formatted = { ...row };
          for (const [key, val] of Object.entries(formatted)) {
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
              formatted[key] = new Date(val);
            }
          }
          return formatted;
        });

        await tx[delegate].createMany({ data: formattedRows });
      }
    }
  });

  return true;
};

module.exports = { getSettings, updateSettings, exportBackup, restoreBackup };
