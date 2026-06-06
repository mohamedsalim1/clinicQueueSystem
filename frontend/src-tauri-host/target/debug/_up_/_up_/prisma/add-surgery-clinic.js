/**
 * add-surgery-clinic.js
 * يضيف عيادة الجراحة العامة مباشرة إلى قاعدة البيانات
 * التشغيل: node prisma/add-surgery-clinic.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: '11' },
    update: {
      name: 'عيادة الجراحة العامة',
      nameAr: 'General Surgery',
      prefix: 'K',
      audioKey: 'generalSurgeryClinic',
      isActive: true,
    },
    create: {
      id: '11',
      name: 'عيادة الجراحة العامة',
      nameAr: 'General Surgery',
      prefix: 'K',
      audioKey: 'generalSurgeryClinic',
      currentNumber: 0,
      isActive: true,
    },
  });
  console.log('✅ تمت إضافة العيادة:', clinic.name, '| prefix:', clinic.prefix);
}

main()
  .catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
