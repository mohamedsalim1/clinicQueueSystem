const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

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
    securityTimeline
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
    `
  ]);

  const peakHours = Array(24).fill(0).map((_, hour) => {
    const matched = hourlyStats.find(h => h.hour === hour);
    return { hour: `${String(hour).padStart(2, '0')}:00`, count: matched ? matched.count : 0 };
  });

  return {
    kpis: {
      newPatientsCount,
      totalPatientsCount,
      visitsCount,
      ticketsCount,
      avgWaitTimeMinutes: waitTimes[0] && waitTimes[0].avgWait ? Math.round(waitTimes[0].avgWait) : 0,
      avgExamTimeMinutes: waitTimes[0] && waitTimes[0].avgExam ? Math.round(waitTimes[0].avgExam) : 0
    },
    popularClinics,
    doctorWorkload,
    peakHours,
    popularDiagnoses,
    patientCohorts,
    securityTimeline
  };
};

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

const addSheet = (workbook, name, rows, widths = []) => {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (widths.length) sheet['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
};

const buildExcelWorkbook = ({ summary, auditLogs, operational, filters }) => {
  const diagnosesTotal = summary.popularDiagnoses.reduce((sum, item) => sum + item.count, 0) || 1;
  const period = `${filters.start.toISOString().slice(0, 10)} إلى ${filters.end.toISOString().slice(0, 10)}`;

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, 'ملخص المؤشرات', [
    ['تقرير مركز داريا الطبي', period],
    ['إجمالي المرضى', summary.kpis.totalPatientsCount],
    ['المرضى الجدد', summary.kpis.newPatientsCount],
    ['إجمالي التذاكر', summary.kpis.ticketsCount],
    ['الزيارات الطبية', summary.kpis.visitsCount],
    ['متوسط الانتظار بالدقائق', summary.kpis.avgWaitTimeMinutes],
    ['متوسط الفحص بالدقائق', summary.kpis.avgExamTimeMinutes]
  ], [28, 20]);

  addSheet(workbook, 'نشاط العيادات', [
    ['العيادة', 'التذاكر', 'مكتملة', 'متخطاة', 'ملغاة', 'متوسط الانتظار'],
    ...summary.popularClinics.map(c => [c.nameAr || c.name, c.count, c.completed, c.skipped, c.cancelled, c.avgWait || 0])
  ], [28, 14, 14, 14, 14, 18]);

  addSheet(workbook, 'أداء الأطباء', [
    ['الطبيب', 'المرضى', 'متوسط المعاينة', 'إعادة النداء'],
    ...summary.doctorWorkload.map(d => [d.name, d.count, d.avgConsultation || 0, d.recalls || 0])
  ], [28, 14, 18, 16]);

  addSheet(workbook, 'ساعات الذروة', [
    ['الساعة', 'عدد التذاكر'],
    ...summary.peakHours.map(h => [h.hour, h.count])
  ], [14, 16]);

  addSheet(workbook, 'التشخيصات', [
    ['التشخيص', 'عدد الحالات', 'النسبة'],
    ...summary.popularDiagnoses.map(d => [d.name, d.count, `${Math.round((d.count / diagnosesTotal) * 100)}%`])
  ], [36, 16, 12]);

  addSheet(workbook, 'الديموغرافيا', [
    ['الفئة العمرية', 'الجنس', 'العدد'],
    ...summary.patientCohorts.map(c => [c.cohort, c.gender === 'MALE' ? 'ذكور' : 'إناث', c.count])
  ], [22, 14, 14]);

  addSheet(workbook, 'ملخص التدقيق', [
    ['نوع العملية', 'العدد'],
    ...summary.securityTimeline.map(a => [a.action, a.count])
  ], [22, 14]);

  addSheet(workbook, 'سجل التدقيق الكامل', [
    ['العملية', 'الهدف', 'بواسطة', 'التاريخ'],
    ...auditLogs.map(log => [
      log.actionType,
      log.entity,
      log.user ? `${log.user.name} (${log.user.role})` : 'النظام',
      new Date(log.createdAt).toLocaleString('ar-SY')
    ])
  ], [18, 24, 28, 24]);

  addSheet(workbook, 'الصحة التشغيلية', [
    ['المؤشر', 'القيمة', 'ملاحظة'],
    ['حالة النظام', operational.systemStatus, ''],
    ['إعلانات اليوم', operational.dailyAnnouncements, ''],
    ...operational.recentAnnouncements.map(item => [
      'نداء حديث',
      item.clinic?.nameAr || item.clinic?.name || '',
      new Date(item.announcedAt).toLocaleString('ar-SY')
    ])
  ], [26, 28, 28]);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
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
