/**
 * seed.js — بيانات تأسيسية للنظام (Stable Foundation v1)
 * يُنشئ العيادات العشرة، حسابات المديرين، وإعدادات النظام الافتراضية
 *
 * التشغيل: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء تهيئة قاعدة البيانات (v1)...');

  // ——— 1. إنشاء العيادات (باستخدام audioKey المستقر) ———
  // audioKey يجب أن يطابق اسم الملف في public/audio/clinics/ بدون الامتداد .wav
  const clinicsData = [
    { id: '1',  name: 'عيادة الداخلية العامة',  nameAr: 'Internal Medicine',    prefix: 'A', audioKey: 'generalInternalClinic' },
    { id: '2',  name: 'عيادة الأطفال', nameAr: 'Pediatrics', prefix: 'B', audioKey: 'babyClinic'     },
    { id: '3',  name: 'عيادة اللقاح',           nameAr: 'Vaccination',            prefix: 'C', audioKey: 'vaccinationClinic'    },
    { id: '4',  name: 'عيادة الأمراض المزمنة', nameAr: 'Chronic Diseases',       prefix: 'D', audioKey: 'chronicDiseasesClinic' },
    { id: '5',  name: 'عيادة العظمية',          nameAr: 'Orthopedics',            prefix: 'E', audioKey: 'orthopedicClinic'     },
    { id: '6',  name: 'عيادة النسائية',         nameAr: 'Gynecology',             prefix: 'F', audioKey: 'womenClinic'          },
    { id: '7',  name: 'عيادة بوابة التعافي',    nameAr: 'Recovery Gate',          prefix: 'G', audioKey: 'recoverGateClinic'   },
    { id: '8',  name: 'المخبر',                 nameAr: 'Laboratory',             prefix: 'H', audioKey: 'laboratory'           },
    { id: '9',  name: 'عيادة الضماد',           nameAr: 'Dressing',               prefix: 'I', audioKey: 'damadClinic'          },
    { id: '10', name: 'عيادة الأسنان',          nameAr: 'Dental',                 prefix: 'J', audioKey: 'dentalClinic'         },
    { id: '11', name: 'عيادة الجراحة العامة',   nameAr: 'General Surgery',        prefix: 'K', audioKey: 'generalSurgeryClinic' },
    { id: '12', name: 'عيادة التغذية',          nameAr: 'Nutrition',              prefix: 'L', audioKey: 'feedClinic' },
  ];

  for (const clinic of clinicsData) {
    await prisma.clinic.upsert({
      where: { id: clinic.id }, // بحث بالـ ID لضمان تحديث audioKey للسجلات الموجودة
      update: {
        audioKey: clinic.audioKey, // تصحيح المفتاح الصوتي عند كل تشغيل للسيد
        prefix: clinic.prefix,
      },
      create: { ...clinic, currentNumber: 0, isActive: true },
    });
  }
  console.log('✅ 11 عيادة افتراضية: جاهزة');

  // ——— 2. إنشاء حساب SUPER_ADMIN ———
  const superAdminHash = await bcrypt.hash('SuperAdmin@2026', 10);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash: superAdminHash,
      name: 'مدير النظام',
      role: 'SUPER_ADMIN',
      isActive: true,
      mustChangePass: true,
    },
  });
  console.log('✅ SUPER_ADMIN: جاهز (كلمة المرور: SuperAdmin@2026)');

  // ——— 3. إنشاء حساب ADMIN ———
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      name: 'مدير المستوصف',
      role: 'ADMIN',
      isActive: true,
      mustChangePass: true,
    },
  });
  console.log('✅ ADMIN: جاهز (كلمة المرور: Admin@123)');

  // ——— 4. إعدادات النظام الافتراضية (Key-Value) ———
  const settingsData = [
    { key: 'ticker_text', value: 'مركز داريا الطبي الإسعافي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل' },
    { key: 'clinic_title', value: 'مركز داريا الطبي الإسعافي' },
    { key: 'clinic_subtitle', value: 'Daraya Medical Center' },
    { key: 'footer_msg', value: 'يرجى انتظار ظهور رقمك على شاشة العرض' },
    { key: 'printer_name', value: '10.0.0.2' },
    { key: 'audio_enabled', value: 'true' },
    { key: 'master_display_ip', value: '0.0.0.0' },
    { key: 'reset_policy', value: 'daily' },
  ];

  for (const setting of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ إعدادات النظام: جاهزة');

  console.log('\n🚀 قاعدة البيانات جاهزة للاستخدام!');
}

main()
  .catch(e => { console.error('❌ خطأ في التهيئة:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());