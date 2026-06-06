/**
 * settings.service.js — خدمة إعدادات النظام
 */

const { Prisma, PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

module.exports = { getSettings, updateSettings, exportBackup };
