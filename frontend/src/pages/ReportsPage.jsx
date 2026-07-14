import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import '../styles/AdminMedicalPages.css';

const tabs = [
  { id: 'overview', label: 'الملخص' },
  { id: 'queues', label: 'الطوابير' },
  { id: 'clinical', label: 'التشخيصات' },
  { id: 'doctors', label: 'الأطباء' },
  { id: 'patients', label: 'المرضى' },
  { id: 'audit', label: 'التدقيق' },
  { id: 'operational', label: 'التشغيل' }
];

const formatNumber = (value) => new Intl.NumberFormat('ar-SY').format(value || 0);

const formatDateTime = (value) => value ? new Date(value).toLocaleString('ar-SY') : '-';

const percent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const buildQuery = (filters) => {
  const query = new URLSearchParams();
  if (filters.startDate) query.append('startDate', filters.startDate);
  if (filters.endDate) query.append('endDate', filters.endDate);
  if (filters.clinicId && filters.clinicId !== 'all') query.append('clinicId', filters.clinicId);
  return query.toString();
};

const KpiCard = ({ title, value, note, tone = 'teal' }) => (
  <div className="admin-card">
    <h3 className="admin-card-title">{title}</h3>
    <p className="admin-card-sub">{note}</p>
    <div className={`admin-kpi-value ${tone}`}>{value}</div>
  </div>
);

const BarList = ({ rows, labelKey = 'name', valueKey = 'count', empty = 'لا توجد بيانات' }) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  if (!rows.length) return <div className="admin-empty">{empty}</div>;

  return (
    <div className="admin-bars">
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div className="admin-bar-row" key={`${row[labelKey] || index}-${index}`}>
            <strong>{row.nameAr || row[labelKey] || 'غير محدد'}</strong>
            <div className="admin-bar-track">
              <div className="admin-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="admin-badge teal">{formatNumber(value)}</span>
          </div>
        );
      })}
    </div>
  );
};

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [auditData, setAuditData] = useState([]);
  const [operationalData, setOperationalData] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    clinicId: 'all'
  });

  const { addToast } = useToast();

  const loadClinics = async () => {
    try {
      const res = await apiClient.get('/settings/clinics');
      setClinics(res.data.clinics || []);
    } catch {
      addToast('فشل تحميل قائمة العيادات', 'error');
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const query = buildQuery(filters);
      const [summaryRes, auditRes, operationalRes] = await Promise.all([
        apiClient.get(`/reports/summary?${query}`),
        apiClient.get('/reports/audit?limit=50'),
        apiClient.get('/reports/operational')
      ]);
      setReportData(summaryRes.data);
      setAuditData(auditRes.data.data || auditRes.data || []);
      setOperationalData(operationalRes.data.stats || null);
    } catch (error) {
      addToast('فشل تحميل التقارير الطبية والإحصائية', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (event) => {
    event.preventDefault();
    loadReports();
  };

  const handleExport = async () => {
    try {
      addToast('جاري تجهيز ملف Excel الكامل...', 'info');
      const response = await apiClient.get(`/reports/export?${buildQuery(filters)}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `darayya_clinic_reports_${new Date().toLocaleDateString('en-CA')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('تم تصدير التقارير بنجاح', 'success');
    } catch {
      addToast('فشل تصدير ملف التقارير', 'error');
    }
  };

  const totalDiagnosis = useMemo(() => {
    return (reportData?.popularDiagnoses || []).reduce((sum, item) => sum + item.count, 0);
  }, [reportData]);

  const totalPatientsByCohort = useMemo(() => {
    return (reportData?.patientCohorts || []).reduce((sum, item) => sum + item.count, 0);
  }, [reportData]);

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <div className="admin-hero-row">
          <div>
            <h1 className="admin-title">التقارير الطبية والإحصائيات</h1>
            <p className="admin-subtitle">لوحة متابعة تشغيلية وسريرية تعرض الأداء، الضغط، التشخيصات، وسلامة العمليات.</p>
          </div>
          <button className="admin-btn primary" type="button" onClick={handleExport}>
            تصدير Excel
          </button>
        </div>

        <form className="admin-toolbar" onSubmit={handleFilter}>
          <div className="admin-field">
            <label className="admin-label">العيادة</label>
            <select className="admin-select" value={filters.clinicId} onChange={(e) => setFilters((prev) => ({ ...prev, clinicId: e.target.value }))}>
              <option value="all">كل العيادات</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>{clinic.nameAr || clinic.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">من تاريخ</label>
            <input className="admin-input" type="date" dir="ltr" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">إلى تاريخ</label>
            <input className="admin-input" type="date" dir="ltr" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
          </div>
          <button className="admin-btn primary" type="submit" disabled={isLoading}>تطبيق</button>
        </form>
      </header>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="admin-loading">جاري تحميل مؤشرات الأداء...</div>
      ) : !reportData ? (
        <div className="admin-empty">لا توجد بيانات تقارير متاحة.</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="admin-grid">
                <KpiCard title="إجمالي التذاكر" value={formatNumber(reportData.kpis.ticketsCount)} note="كل التذاكر ضمن الفترة" />
                <KpiCard title="الزيارات الطبية" value={formatNumber(reportData.kpis.visitsCount)} note="زيارات محفوظة في السجل الطبي" />
                <KpiCard title="مرضى جدد" value={formatNumber(reportData.kpis.newPatientsCount)} note={`من أصل ${formatNumber(reportData.kpis.totalPatientsCount)} ملف`} />
                <KpiCard title="متوسط الانتظار" value={`${formatNumber(reportData.kpis.avgWaitTimeMinutes)} د`} note="من إصدار الرقم حتى النداء" />
                <KpiCard title="متوسط المعاينة" value={`${formatNumber(reportData.kpis.avgExamTimeMinutes)} د`} note="من النداء حتى الإتمام" />
                <KpiCard title="نسبة الإتمام" value={`${formatNumber(reportData.kpis.completionRate)}%`} note={reportData.insights?.serviceSignal || 'قراءة تشغيلية'} />
              </div>

              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">العيادات الأعلى مراجعة</h2>
                  <span className="admin-badge teal">الذروة {reportData.insights?.busiestHour || '-'}</span>
                </div>
                <div style={{ padding: '1rem' }}>
                  <BarList rows={reportData.popularClinics.slice(0, 8)} labelKey="name" />
                </div>
              </section>
            </>
          )}

          {activeTab === 'queues' && (
            <section className="admin-section">
              <div className="admin-section-header">
                <h2 className="admin-section-title">كفاءة الطوابير حسب العيادة</h2>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>العيادة</th>
                      <th>التذاكر</th>
                      <th>مكتملة</th>
                      <th>تخطي/إلغاء</th>
                      <th>متوسط الانتظار</th>
                      <th>مؤشر الخدمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.popularClinics.map((clinic) => {
                      const exceptions = (clinic.skipped || 0) + (clinic.cancelled || 0);
                      const serviceClass = clinic.avgWait < 20 ? 'green' : clinic.avgWait < 45 ? 'amber' : 'red';
                      return (
                        <tr key={clinic.name}>
                          <td><strong>{clinic.nameAr || clinic.name}</strong></td>
                          <td>{formatNumber(clinic.count)}</td>
                          <td><span className="admin-badge green">{formatNumber(clinic.completed)}</span></td>
                          <td><span className="admin-badge red">{formatNumber(exceptions)}</span></td>
                          <td>{formatNumber(clinic.avgWait || 0)} دقيقة</td>
                          <td><span className={`admin-badge ${serviceClass}`}>{clinic.avgWait < 30 ? 'مستقر' : 'يحتاج متابعة'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'clinical' && (
            <section className="admin-section">
              <div className="admin-section-header">
                <h2 className="admin-section-title">التشخيصات الأكثر تكراراً</h2>
                <span className="admin-badge teal">{formatNumber(totalDiagnosis)} تشخيص</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>التشخيص</th>
                      <th>عدد الحالات</th>
                      <th>النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.popularDiagnoses.map((diagnosis, index) => (
                      <tr key={`${diagnosis.name}-${index}`}>
                        <td>{index + 1}</td>
                        <td><strong>{diagnosis.name}</strong></td>
                        <td>{formatNumber(diagnosis.count)}</td>
                        <td>
                          <div className="admin-bar-track">
                            <div className="admin-bar-fill" style={{ width: `${percent(diagnosis.count, totalDiagnosis)}%` }} />
                          </div>
                          <span style={{ color: '#64748b', fontSize: '.78rem' }}>{percent(diagnosis.count, totalDiagnosis)}%</span>
                        </td>
                      </tr>
                    ))}
                    {reportData.popularDiagnoses.length === 0 && (
                      <tr><td colSpan="4"><div className="admin-empty">لا توجد تشخيصات ضمن الفترة المحددة.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'doctors' && (
            <div className="admin-grid">
              {reportData.doctorWorkload.map((doctor) => (
                <div className="admin-card" key={doctor.name}>
                  <h3 className="admin-card-title">د. {doctor.name}</h3>
                  <p className="admin-card-sub">أداء الطبيب ضمن الفترة</p>
                  <div className="admin-kpi-value">{formatNumber(doctor.count)}</div>
                  <div className="family-meta">
                    <span className="admin-badge blue">معاينة {formatNumber(doctor.avgConsultation || 0)} د</span>
                    <span className="admin-badge amber">إعادة نداء {formatNumber(doctor.recalls || 0)}</span>
                  </div>
                </div>
              ))}
              {reportData.doctorWorkload.length === 0 && <div className="admin-empty">لا توجد بيانات أطباء ضمن الفترة.</div>}
            </div>
          )}

          {activeTab === 'patients' && (
            <>
              <section className="admin-section">
                <div className="admin-section-header">
                  <div>
                    <h2 className="admin-section-title">زيارات المرضى والأدوار</h2>
                    <p className="admin-subtitle">تفصيل المراجعين حسب العيادة وتوقيت أخذ الدور ضمن الفترة المحددة.</p>
                  </div>
                  <span className="admin-badge teal">{formatNumber(reportData.patientVisitRows?.length || 0)} سجل</span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table-dense patient-visits-report-table">
                    <thead>
                      <tr>
                        <th>اسم المريض</th>
                        <th>العمر</th>
                        <th>الجنس</th>
                        <th>رقم الموبايل</th>
                        <th>العنوان</th>
                        <th>العيادة التي ارتادها</th>
                        <th>تاريخ ارتياد العيادة</th>
                        <th>رقم الدور</th>
                        <th>وقت النداء</th>
                        <th>حالة الدور</th>
                        <th>الطبيب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.patientVisitRows || []).map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.patientName}</strong>
                            <div className="admin-muted">ملف: {row.fileNumber || '-'}</div>
                          </td>
                          <td>{row.patientAge ?? '-'}</td>
                          <td>{row.patientGender}</td>
                          <td dir="ltr">{row.mobilePhone || '-'}</td>
                          <td className="admin-table-address">{row.address || '-'}</td>
                          <td>{row.clinicName}</td>
                          <td>{formatDateTime(row.visitDate)}</td>
                          <td><span className="admin-badge blue">{row.queueNumber || '-'}</span></td>
                          <td>{formatDateTime(row.calledAt)}</td>
                          <td><span className={`admin-badge ${row.status === 'COMPLETED' ? 'green' : row.status === 'SKIPPED' || row.status === 'CANCELLED' ? 'red' : 'amber'}`}>{row.statusLabel}</span></td>
                          <td>{row.doctorName || '-'}</td>
                        </tr>
                      ))}
                      {(reportData.patientVisitRows || []).length === 0 && (
                        <tr><td colSpan="11"><div className="admin-empty">لا توجد زيارات مرضى ضمن الفترة المحددة.</div></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">ديموغرافية المرضى</h2>
                  <span className="admin-badge teal">{formatNumber(totalPatientsByCohort)} ملف نشط</span>
                </div>
                <div style={{ padding: '1rem' }}>
                  <BarList rows={reportData.patientCohorts.map((item) => ({
                    ...item,
                    name: `${item.cohort} - ${item.gender === 'MALE' ? 'ذكور' : 'إناث'}`
                  }))} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'audit' && (
            <section className="admin-section">
              <div className="admin-section-header">
                <h2 className="admin-section-title">آخر عمليات التدقيق</h2>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>العملية</th>
                      <th>الكيان</th>
                      <th>المستخدم</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.map((log) => (
                      <tr key={log.id}>
                        <td><span className="admin-badge blue">{log.actionType}</span></td>
                        <td>{log.entity || '-'}</td>
                        <td>{log.user?.name || 'النظام'}</td>
                        <td>{new Date(log.createdAt).toLocaleString('ar-SY')}</td>
                      </tr>
                    ))}
                    {auditData.length === 0 && <tr><td colSpan="4"><div className="admin-empty">لا توجد عمليات تدقيق مسجلة.</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'operational' && (
            <div className="admin-grid">
              <KpiCard title="حالة النظام" value={operationalData?.systemStatus || 'ONLINE'} note="حالة التشغيل العامة" />
              <KpiCard title="نداءات اليوم" value={formatNumber(operationalData?.dailyAnnouncements || 0)} note="عدد النداءات الصوتية" />
              <section className="admin-section" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                <div className="admin-section-header">
                  <h2 className="admin-section-title">آخر النداءات</h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>العيادة</th><th>الوقت</th></tr></thead>
                    <tbody>
                      {(operationalData?.recentAnnouncements || []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.clinic?.nameAr || item.clinic?.name || '-'}</td>
                          <td>{new Date(item.announcedAt).toLocaleString('ar-SY')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
