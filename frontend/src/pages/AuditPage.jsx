import React, { useEffect, useMemo, useState } from 'react';
import auditService from '../services/auditService';
import { useToast } from '../context/ToastContext';
import '../styles/AdminMedicalPages.css';

const ACTION_MAP = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  LOGIN: 'دخول',
  CALL: 'نداء',
  PRINT: 'طباعة'
};

const ACTION_CLASS = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'teal',
  CALL: 'amber',
  PRINT: 'blue'
};

const formatDetails = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const normalizeLogs = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.logs)) return payload.logs;
  return [];
};

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ actionType: 'all', query: '' });
  const { addToast } = useToast();

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await auditService.getLogs();
      setLogs(normalizeLogs(data));
    } catch (error) {
      addToast('فشل تحميل سجل المراجعة', 'error');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return logs.filter((log) => {
      const actionOk = filters.actionType === 'all' || log.actionType === filters.actionType;
      const haystack = [
        log.user?.name,
        log.user?.username,
        log.entity,
        log.entityId,
        log.actionType,
        formatDetails(log.newValue),
        formatDetails(log.oldValue)
      ].filter(Boolean).join(' ').toLowerCase();
      return actionOk && (!q || haystack.includes(q));
    });
  }, [logs, filters]);

  const actionCounts = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc[log.actionType] = (acc[log.actionType] || 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <div className="admin-hero-row">
          <div>
            <h1 className="admin-title">سجل المراجعة والتتبع</h1>
            <p className="admin-subtitle">عرض مركزي للإجراءات الحساسة والتعديلات التي تمت على النظام.</p>
          </div>
          <button className="admin-btn primary" type="button" onClick={fetchLogs} disabled={isLoading}>
            تحديث السجل
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-field">
            <label className="admin-label">نوع العملية</label>
            <select
              className="admin-select"
              value={filters.actionType}
              onChange={(e) => setFilters((prev) => ({ ...prev, actionType: e.target.value }))}
            >
              <option value="all">كل العمليات</option>
              {Object.entries(ACTION_MAP).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="admin-field grow">
            <label className="admin-label">بحث</label>
            <input
              className="admin-input"
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="المستخدم، الكيان، رقم العملية، أو تفاصيل التغيير"
            />
          </div>
        </div>
      </header>

      <div className="admin-grid">
        <div className="admin-card">
          <h3 className="admin-card-title">إجمالي السجلات</h3>
          <p className="admin-card-sub">آخر العمليات المسجلة</p>
          <div className="admin-kpi-value">{logs.length}</div>
        </div>
        {Object.entries(actionCounts).slice(0, 5).map(([action, count]) => (
          <div className="admin-card" key={action}>
            <h3 className="admin-card-title">{ACTION_MAP[action] || action}</h3>
            <p className="admin-card-sub">عدد العمليات</p>
            <div className="admin-kpi-value">{count}</div>
          </div>
        ))}
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">تفاصيل السجل</h2>
          <span className="admin-badge blue">{filteredLogs.length} نتيجة</span>
        </div>

        {isLoading ? (
          <div className="admin-loading">جاري تحميل سجل المراجعة...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="admin-empty">لا توجد سجلات مطابقة. إذا بقي السجل فارغاً بعد استخدام النظام فمعناه أن عمليات التتبع غير مفعلة في مسارات الإدخال.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المستخدم</th>
                  <th>العملية</th>
                  <th>الكيان</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('ar-SY')}</td>
                    <td>
                      <strong>{log.user?.name || 'النظام'}</strong>
                      {log.user?.username && <div style={{ color: '#64748b', fontSize: '.78rem' }}>{log.user.username}</div>}
                    </td>
                    <td>
                      <span className={`admin-badge ${ACTION_CLASS[log.actionType] || ''}`}>
                        {ACTION_MAP[log.actionType] || log.actionType}
                      </span>
                    </td>
                    <td>
                      <strong>{log.entity || '-'}</strong>
                      {log.entityId && <div style={{ color: '#64748b', fontSize: '.78rem' }}>{log.entityId}</div>}
                    </td>
                    <td>
                      <div className="audit-details">{formatDetails(log.newValue || log.oldValue)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuditPage;
