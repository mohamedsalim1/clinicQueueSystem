/**
 * settings.service.js — خدمة إعدادات النظام
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULTS = {
  id:            1,
  tickerText:    'مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل',
  clinicTitle:   'مركز داريا الطبي',
  clinicSubtitle:'Daraya Medical Center',
  footerMsg:     'يرجى انتظار ظهور رقمك على شاشة العرض',
  printerName:   'Thermal_Printer',
};

const getSettings = async () => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: DEFAULTS });
    }
    return settings;
  } catch (error) {
    return DEFAULTS;
  }
};

const updateSettings = async (data) => {
  const allowed = ['tickerText', 'clinicTitle', 'clinicSubtitle', 'footerMsg', 'printerName'];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );

  return await prisma.systemSettings.upsert({
    where:  { id: 1 },
    update: filtered,
    create: { ...DEFAULTS, ...filtered },
  });
};

module.exports = { getSettings, updateSettings };
