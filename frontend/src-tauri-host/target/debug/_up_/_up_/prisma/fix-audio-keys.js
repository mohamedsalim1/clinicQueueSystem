/**
 * fix-audio-keys.js
 * يصحح قيم audioKey في جدول Clinic لتطابق أسماء الملفات الصوتية الفعلية
 * داخل: frontend/public/audio/clinics/
 *
 * التشغيل: node prisma/fix-audio-keys.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// الخريطة: name (كما في DB) → audioKey الصحيح (اسم الملف بدون .wav)
const FIX_MAP = [
  { id: '1',  correctAudioKey: 'generalInternalClinic' },  // كان: internal
  { id: '2',  correctAudioKey: 'babyAndFeedClinic'     },  // كان: pediatrics
  { id: '3',  correctAudioKey: 'vaccinationClinic'     },  // كان: vaccination
  { id: '4',  correctAudioKey: 'chronicDiseasesClinic' },  // كان: chronic
  { id: '5',  correctAudioKey: 'orthopedicClinic'      },  // كان: orthopedics
  { id: '6',  correctAudioKey: 'womenClinic'           },  // كان: gynecology
  { id: '7',  correctAudioKey: 'recoverGateClinic'     },  // كان: recovery
  { id: '8',  correctAudioKey: 'laboratory'            },  // كان: lab
  { id: '9',  correctAudioKey: 'damadClinic'           },  // كان: dressing
  { id: '10', correctAudioKey: 'dentalClinic'          },  // كان: dental
];

async function main() {
  console.log('🔧 تصحيح audioKey للعيادات...\n');

  for (const entry of FIX_MAP) {
    const clinic = await prisma.clinic.findUnique({ where: { id: entry.id } });

    if (!clinic) {
      console.warn(`  ⚠️  العيادة id=${entry.id} غير موجودة، تخطي.`);
      continue;
    }

    if (clinic.audioKey === entry.correctAudioKey) {
      console.log(`  ✅ id=${entry.id} "${clinic.name}" — audioKey صحيح بالفعل: ${clinic.audioKey}`);
      continue;
    }

    await prisma.clinic.update({
      where: { id: entry.id },
      data:  { audioKey: entry.correctAudioKey },
    });

    console.log(`  🔄 id=${entry.id} "${clinic.name}"`);
    console.log(`      قديم: ${clinic.audioKey}`);
    console.log(`      جديد: ${entry.correctAudioKey}\n`);
  }

  console.log('\n✅ تم تصحيح جميع audioKeys. يمكنك الآن إعادة تشغيل الخادم.');
}

main()
  .catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
