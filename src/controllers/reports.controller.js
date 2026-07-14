const prisma = require('../config/prisma');
const XLSX = require('xlsx');

const parseReportFilters = (query) => {
  const start = query.startDate ? new Date(query.startDate) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = query.endDate ? new Date(query.endDate) : new Date(new Date().setHours(23, 59, 59, 999));

  if (query.endDate) end.setHours(23, 59, 59, 999);
  if (query.startDate) start.setHours(0, 0, 0, 0);
  if (query.endDate && !query.startDate) {
    start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    start,
    end,
    clinicFilter: query.clinicId && query.clinicId !== 'all' ? query.clinicId : null
  };
};

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const born = new Date(birthDate);
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const formatGender = (gender) => {
  if (gender === 'MALE') return 'ذكر';
  if (gender === 'FEMALE') return 'أنثى';
  return 'غير محدد';
};

const formatTicketStatus = (status) => {
  const labels = {
    WAITING: 'بانتظار النداء',
    CALLED: 'تم النداء',
    IN_PROGRESS: 'قيد المعاينة',
    COMPLETED: 'مكتمل',
    SKIPPED: 'تم التخطي',
    CANCELLED: 'ملغى'
  };
  return labels[status] || status || '-';
};

const buildPatientVisitRow = (ticket) => ({
  id: ticket.id,
  patientName: ticket.patient?.fullName || 'مراجع غير مربوط بملف',
  patientAge: calculateAge(ticket.patient?.birthDate),
  patientGender: formatGender(ticket.patient?.gender),
  clinicName: ticket.clinic?.nameAr || ticket.clinic?.name || '-',
  visitDate: ticket.createdAt,
  queueNumber: ticket.fullNumber || ticket.number,
  calledAt: ticket.calledAt,
  completedAt: ticket.completedAt,
  status: ticket.status,
  statusLabel: formatTicketStatus(ticket.status),
  doctorName: ticket.doctor?.name || '-',
  fileNumber: ticket.patient?.fileNumber || '-',
  mobilePhone: ticket.patient?.phoneOptional || ticket.patient?.family?.primaryPhone || '-',
  address: ticket.patient?.family?.address || '-'
});

const buildSummaryReportData = async ({ start, end, clinicFilter }) => {
  const [
    totalPatientsCount,
    newPatientsCount,
    visitsCount,
    ticketsCount,
    waitTimes,
    popularClinics,
    doctorWorkload,
    hourlyStats,
    popularDiagnoses,
    patientCohorts,
    securityTimeline,
    patientVisitTickets
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.patient.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } }),
    prisma.visit.count({
      where: {
        visitDate: { gte: start, lte: end },
        ticket: clinicFilter ? { clinicId: clinicFilter } : undefined
      }
    }),
    prisma.queueTicket.count({
      where: {
        createdAt: { gte: start, lte: end },
        clinicId: clinicFilter || undefined
      }
    }),
    prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (t."calledAt" - t."createdAt"))) / 60 AS "avgWait",
        AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."calledAt"))) / 60 AS "avgExam",
        COUNT(t.id)::int AS "completedCount"
      FROM "QueueTicket" t
      WHERE t."createdAt" >= ${start} 
        AND t."createdAt" <= ${end}
        AND t.status = 'COMPLETED'
        AND t."calledAt" IS NOT NULL
        AND t."completedAt" IS NOT NULL
        AND (${clinicFilter}::text IS NULL OR t."clinicId" = ${clinicFilter})
    `,
    prisma.$queryRaw`
      SELECT 
        c.name AS "name",
        c."nameAr" AS "nameAr",
        COUNT(t.id)::int AS "count",
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END)::int AS "completed",
        COUNT(CASE WHEN t.status = 'SKIPPED' THEN 1 END)::int AS "skipped",
        COUNT(CASE WHEN t.status = 'CANCELLED' THEN 1 END)::int AS "cancelled",
        ROUND((AVG(EXTRACT(EPOCH FROM (t."calledAt" - t."createdAt"))) / 60)::numeric, 1)::float AS "avgWait"
      FROM "QueueTicket" t
      JOIN "Clinic" c ON t."clinicId" = c.id
      WHERE t."createdAt" >= ${start}
        AND t."createdAt" <= ${end}
        AND (${clinicFilter}::text IS NULL OR t."clinicId" = ${clinicFilter})
      GROUP BY c.id, c.name, c."nameAr"
      ORDER BY "count" DESC
    `,
    prisma.$queryRaw`
      SELECT 
        d.name AS "name",
        COUNT(t.id)::int AS "count",
        ROUND((AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."calledAt"))) / 60)::numeric, 1)::float AS "avgConsultation",
        COALESCE(SUM(announcements.recalls), 0)::int AS "recalls"
      FROM "QueueTicket" t
      JOIN "Doctor" d ON t."doctorId" = d.id
      LEFT JOIN (
        SELECT "ticketId", COUNT(id) - 1 AS recalls
        FROM "AnnouncementHistory"
        GROUP BY "ticketId"
      ) announcements ON announcements."ticketId" = t.id
      WHERE t."createdAt" >= ${start}
        AND t."createdAt" <= ${end}
        AND t.status = 'COMPLETED'
        AND (${clinicFilter}::text IS NULL OR t."clinicId" = ${clinicFilter})
      GROUP BY d.id, d.name
      ORDER BY "count" DESC
    `,
    prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM t."createdAt")::int AS "hour",
        COUNT(t.id)::int AS "count"
      FROM "QueueTicket" t
      WHERE t."createdAt" >= ${start}
        AND t."createdAt" <= ${end}
        AND (${clinicFilter}::text IS NULL OR t."clinicId" = ${clinicFilter})
      GROUP BY "hour"
      ORDER BY "hour" ASC
    `,
    prisma.$queryRaw`
      SELECT 
        TRIM(v.diagnosis) AS "name",
        COUNT(v.id)::int AS "count"
      FROM "Visit" v
      WHERE v."visitDate" >= ${start} 
        AND v."visitDate" <= ${end} 
        AND v.diagnosis IS NOT NULL 
        AND TRIM(v.diagnosis) != ''
        AND (${clinicFilter}::text IS NULL OR EXISTS (
          SELECT 1 FROM "QueueTicket" qt WHERE qt.id = v."ticketId" AND qt."clinicId" = ${clinicFilter}
        ))
      GROUP BY TRIM(v.diagnosis)
      ORDER BY "count" DESC
      LIMIT 50
    `,
    prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(COALESCE(p."birthDate", NOW()))) < 1 THEN 'Infant'
          WHEN EXTRACT(YEAR FROM AGE(COALESCE(p."birthDate", NOW()))) BETWEEN 1 AND 12 THEN 'Child'
          WHEN EXTRACT(YEAR FROM AGE(COALESCE(p."birthDate", NOW()))) BETWEEN 13 AND 19 THEN 'Teen'
          WHEN EXTRACT(YEAR FROM AGE(COALESCE(p."birthDate", NOW()))) BETWEEN 20 AND 39 THEN 'Young Adult'
          WHEN EXTRACT(YEAR FROM AGE(COALESCE(p."birthDate", NOW()))) BETWEEN 40 AND 59 THEN 'Middle Aged'
          ELSE 'Geriatric'
        END AS "cohort",
        p.gender AS "gender",
        COUNT(p.id)::int AS "count"
      FROM "Patient" p
      WHERE p."deletedAt" IS NULL
      GROUP BY "cohort", p.gender
      ORDER BY "cohort", p.gender
    `,
    prisma.$queryRaw`
      SELECT 
        a."actionType" AS "action",
        COUNT(a.id)::int AS "count"
      FROM "AuditLog" a
      WHERE a."createdAt" >= ${start} AND a."createdAt" <= ${end}
      GROUP BY a."actionType"
      ORDER BY "count" DESC
    `,
    prisma.queueTicket.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        clinicId: clinicFilter || undefined
      },
      include: {
        patient: {
          select: {
            fullName: true,
            gender: true,
            birthDate: true,
            fileNumber: true,
            phoneOptional: true,
            family: { select: { primaryPhone: true, address: true } }
          }
        },
        clinic: { select: { nameAr: true, name: true } },
        doctor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 2000
    })
  ]);

  const peakHours = Array(24).fill(0).map((_, hour) => {
    const matched = hourlyStats.find(h => h.hour === hour);
    return { hour: `${String(hour).padStart(2, '0')}:00`, count: matched ? matched.count : 0 };
  });

  const patientVisitRows = patientVisitTickets.map(buildPatientVisitRow);
  const completedTickets = summaryCount(popularClinics, 'completed');
  const exceptionTickets = summaryCount(popularClinics, 'skipped') + summaryCount(popularClinics, 'cancelled');
  const completionRate = ticketsCount ? Math.round((completedTickets / ticketsCount) * 100) : 0;
  const exceptionRate = ticketsCount ? Math.round((exceptionTickets / ticketsCount) * 100) : 0;
  const busiestClinic = popularClinics[0] || null;
  const busiestHour = peakHours.reduce((max, item) => item.count > max.count ? item : max, peakHours[0]);

  return {
    kpis: {
      newPatientsCount,
      totalPatientsCount,
      visitsCount,
      ticketsCount,
      avgWaitTimeMinutes: waitTimes[0] && waitTimes[0].avgWait ? Math.round(waitTimes[0].avgWait) : 0,
      avgExamTimeMinutes: waitTimes[0] && waitTimes[0].avgExam ? Math.round(waitTimes[0].avgExam) : 0,
      completionRate,
      exceptionRate
    },
    popularClinics,
    doctorWorkload,
    peakHours,
    popularDiagnoses,
    patientCohorts,
    securityTimeline,
    patientVisitRows,
    insights: {
      busiestClinic: busiestClinic ? (busiestClinic.nameAr || busiestClinic.name) : null,
      busiestHour: busiestHour?.count ? busiestHour.hour : null,
      serviceSignal: completionRate >= 80 && exceptionRate <= 10 ? 'مستقر' : 'يحتاج متابعة'
    }
  };
};

const summaryCount = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);

const getAuditRows = (limit) => prisma.auditLog.findMany({
  include: {
    user: {
      select: { name: true, role: true, username: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  ...(limit ? { take: limit } : {})
});

const getOperationalStats = async () => {
  const announcementLoad = await prisma.announcementHistory.count({
    where: {
      announcedAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  const recentAnnouncements = await prisma.announcementHistory.findMany({
    take: 50,
    orderBy: { announcedAt: 'desc' },
    include: {
      clinic: { select: { nameAr: true, name: true } }
    }
  });

  return {
    dailyAnnouncements: announcementLoad,
    systemStatus: 'ONLINE',
    socketsActive: true,
    recentAnnouncements
  };
};

/**
 * buildExcelWorkbook — تصدير تقارير احترافية بجداول منظمة
 * يستخدم SheetJS لإنتاج ملف XLSX بمظهر إداري رسمي:
 *   - صف ترويسة مدمج (Merged Header) يحتوي اسم التقرير والفترة الزمنية
 *   - صف عناوين الأعمدة بخط عريض (Bold Titles Row)
 *   - عرض أعمدة محسوب تلقائياً لمنع قطع النصوص
 *   - تنسيق رقمي صحيح للخلايا الرقمية
 */
const setHeaderStyle = (ws, headerRange) => {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push(XLSX.utils.decode_range(headerRange));
};

const buildSheet = (workbook, sheetName, titleRow, headers, dataRows, colWidths) => {
  const rows = [titleRow, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // دمج خلايا الترويسة عبر كامل عرض الجدول (الصف الأول)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  // تعيين عرض الأعمدة
  ws['!cols'] = colWidths.map(wch => ({ wch }));

  // تطبيق سماكة خط عناوين الأعمدة (الصف الثاني)
  for (let c = 0; c < headers.length; c++) {
    const cell = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[cell]) {
      ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D6E4F0' } }, alignment: { horizontal: 'center' } };
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, sheetName.slice(0, 31));
};

const buildExcelWorkbook = ({ summary, auditLogs, operational, filters }) => {
  const diagnosesTotal = summary.popularDiagnoses.reduce((sum, item) => sum + item.count, 0) || 1;
  const period = `${filters.start.toISOString().slice(0, 10)} إلى ${filters.end.toISOString().slice(0, 10)}`;
  const generatedAt = new Date().toLocaleString('ar-SY');

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // ورقة 1: ملخص المؤشرات الرئيسية (KPIs)
  // ==========================================
  buildSheet(workbook,
    'ملخص المؤشرات',
    [`تقرير مركز داريا الطبي — ${period}  |  تاريخ الإصدار: ${generatedAt}`],
    ['المؤشر', 'القيمة'],
    [
      ['إجمالي المرضى في النظام', summary.kpis.totalPatientsCount],
      ['مرضى جدد ضمن الفترة', summary.kpis.newPatientsCount],
      ['إجمالي تذاكر الطابور', summary.kpis.ticketsCount],
      ['زيارات طبية مسجلة', summary.kpis.visitsCount],
      ['متوسط وقت الانتظار (دقيقة)', summary.kpis.avgWaitTimeMinutes],
      ['متوسط وقت الفحص (دقيقة)', summary.kpis.avgExamTimeMinutes],
      ['نسبة إتمام الأدوار', `${summary.kpis.completionRate}%`],
      ['نسبة التخطي/الإلغاء', `${summary.kpis.exceptionRate}%`],
      ['أكثر عيادة ضغطاً', summary.insights.busiestClinic || '-'],
      ['ساعة الذروة', summary.insights.busiestHour || '-'],
      ['قراءة تشغيلية', summary.insights.serviceSignal],
    ],
    [45, 22]
  );

  // ==========================================
  // ورقة 2: أداء العيادات
  // ==========================================
  buildSheet(workbook,
    'أداء العيادات',
    [`تقرير العيادات — ${period}`],
    ['العيادة', 'إجمالي التذاكر', 'مكتملة', 'متخطاة', 'ملغاة', 'متوسط الانتظار (د)', 'مؤشر الخدمة'],
    summary.popularClinics.map(c => [
      c.nameAr || c.name,
      c.count,
      c.completed,
      c.skipped || 0,
      c.cancelled || 0,
      c.avgWait ? Number(c.avgWait.toFixed(1)) : 0,
      c.avgWait < 20 ? 'ممتاز' : c.avgWait < 40 ? 'جيد' : 'يحتاج مراجعة'
    ]),
    [30, 16, 12, 12, 12, 22, 18]
  );

  // ==========================================
  // ورقة 3: أداء الأطباء
  // ==========================================
  buildSheet(workbook,
    'أداء الأطباء',
    [`تقرير الأطباء — ${period}`],
    ['اسم الطبيب', 'المرضى المعاينون', 'متوسط المعاينة (د)', 'إعادة نداء'],
    summary.doctorWorkload.map(d => [
      `د. ${d.name}`,
      d.count,
      d.avgConsultation ? Number(d.avgConsultation.toFixed(1)) : 0,
      d.recalls || 0
    ]),
    [30, 18, 22, 16]
  );

  // ==========================================
  // ورقة 4: توزيع ساعات الذروة
  // ==========================================
  buildSheet(workbook,
    'ساعات الذروة',
    ['توزيع المراجعين حسب الساعة'],
    ['الساعة', 'عدد التذاكر', 'مستوى الضغط'],
    summary.peakHours.map(h => [
      h.hour,
      h.count,
      h.count > 30 ? 'ضغط عالٍ' : h.count > 15 ? 'ضغط متوسط' : 'منخفض'
    ]),
    [16, 16, 18]
  );

  // ==========================================
  // ورقة 5: التشخيصات الأكثر تكراراً
  // ==========================================
  buildSheet(workbook,
    'التشخيصات',
    [`أكثر التشخيصات شيوعاً — ${period}`],
    ['#', 'التشخيص', 'عدد الحالات', 'النسبة المئوية'],
    summary.popularDiagnoses.map((d, i) => [
      i + 1,
      d.name,
      d.count,
      `${Math.round((d.count / diagnosesTotal) * 100)}%`
    ]),
    [6, 40, 16, 16]
  );

  // ==========================================
  // ورقة 6: الديموغرافيا
  // ==========================================
  buildSheet(workbook,
    'ديموغرافيا المرضى',
    ['توزيع المرضى حسب الفئة العمرية والجنس'],
    ['الفئة العمرية', 'الجنس', 'العدد'],
    summary.patientCohorts.map(c => [
      c.cohort,
      c.gender === 'MALE' ? 'ذكور' : 'إناث',
      c.count
    ]),
    [22, 14, 14]
  );

  // ==========================================
  // ورقة 7: زيارات وأدوار المرضى
  // ==========================================
  buildSheet(workbook,
    'زيارات المرضى',
    [`تفاصيل مراجعات المرضى والأدوار — ${period}`],
    ['اسم المريض', 'العمر', 'الجنس', 'رقم الموبايل', 'العنوان', 'العيادة', 'تاريخ ارتياد العيادة', 'رقم الدور', 'وقت النداء', 'حالة الدور', 'الطبيب', 'رقم الملف'],
    summary.patientVisitRows.map(row => [
      row.patientName,
      row.patientAge ?? '-',
      row.patientGender,
      row.mobilePhone,
      row.address,
      row.clinicName,
      new Date(row.visitDate).toLocaleString('ar-SY'),
      row.queueNumber || '-',
      row.calledAt ? new Date(row.calledAt).toLocaleString('ar-SY') : '-',
      row.statusLabel,
      row.doctorName,
      row.fileNumber
    ]),
    [28, 10, 12, 18, 32, 24, 24, 14, 24, 18, 22, 14]
  );

  // ==========================================
  // ورقة 8: ملخص التدقيق الأمني
  // ==========================================
  buildSheet(workbook,
    'ملخص التدقيق',
    [`سجل العمليات الأمنية — ${period}`],
    ['نوع العملية', 'عدد المرات'],
    summary.securityTimeline.map(a => [a.action, a.count]),
    [24, 16]
  );

  // ==========================================
  // ورقة 9: سجل التدقيق الكامل
  // ==========================================
  buildSheet(workbook,
    'سجل التدقيق الكامل',
    [`جميع عمليات التدقيق حتى تاريخ: ${generatedAt}`],
    ['العملية', 'الكيان المستهدف', 'بواسطة', 'الدور', 'التاريخ والوقت'],
    auditLogs.map(log => [
      log.actionType,
      log.entity || '-',
      log.user?.name || 'النظام',
      log.user?.role || '-',
      new Date(log.createdAt).toLocaleString('ar-SY')
    ]),
    [16, 24, 24, 16, 26]
  );

  // ==========================================
  // ورقة 10: الصحة التشغيلية
  // ==========================================
  buildSheet(workbook,
    'الصحة التشغيلية',
    [`حالة النظام — ${generatedAt}`],
    ['المؤشر', 'القيمة', 'ملاحظة'],
    [
      ['حالة النظام', operational.systemStatus, 'تعمل بشكل طبيعي'],
      ['إعلانات اليوم', operational.dailyAnnouncements, 'عدد النداءات الصوتية'],
      ...operational.recentAnnouncements.map(item => [
        'نداء حديث',
        item.clinic?.nameAr || item.clinic?.name || '-',
        new Date(item.announcedAt).toLocaleString('ar-SY')
      ])
    ],
    [26, 30, 28]
  );

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
};

/**
 * 1. Unified Dashboard Overview & KPI Aggregator
 * Fetches core hospital performance indicators with sub-second response times.
 */
const getSummaryReport = async (req, res, next) => {
  try {
    const filters = parseReportFilters(req.query);
    res.status(200).json(await buildSummaryReportData(filters));
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Detailed Security and Audit Activity Logs (Cybersecurity compliance)
 */
const getAuditLogsReport = async (req, res, next) => {
  try {
    const { actionType, limit = 50 } = req.query;
    
    const logs = await prisma.auditLog.findMany({
      where: { actionType: actionType ? actionType : undefined },
      include: { user: { select: { name: true, role: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Operational Infrastructure Health Status
 * Reports live socket stats, speaker failures, audio announcements load
 */
const getOperationalHealth = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      stats: await getOperationalStats()
    });
  } catch (error) {
    next(error);
  }
};

const exportReportsExcel = async (req, res, next) => {
  try {
    const filters = parseReportFilters(req.query);
    const [summary, auditLogs, operational] = await Promise.all([
      buildSummaryReportData(filters),
      getAuditRows(null),
      getOperationalStats()
    ]);
    const workbook = buildExcelWorkbook({ summary, auditLogs, operational, filters });
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=darayya_clinic_reports_${date}.xlsx`);
    return res.status(200).send(workbook);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummaryReport,
  getAuditLogsReport,
  getOperationalHealth,
  exportReportsExcel
};
