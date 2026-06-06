/**
 * QueueTable.jsx — جدول قائمة الانتظار مع اسم المريض والرقم الكامل
 */
import '../styles/QueueTable.css';

import React, { useMemo } from 'react';
import queueService from '../services/queueService';
import { useToast } from '../context/ToastContext';

// ✨ تعديل المفاتيح لتطابق الـ Enum القادم من الباك إند (أحرف كبيرة)
const STATUS_MAP = {
  WAITING:     { label: 'قيد الانتظار', cls: 'badge-waiting'   },
  CALLED:      { label: 'يُنادى الآن',  cls: 'badge-called'    },
  IN_PROGRESS: { label: 'داخل العيادة', cls: 'badge-progress'  },
  COMPLETED:   { label: 'مكتمل',       cls: 'badge-completed' },
  SKIPPED:     { label: 'تم التخطي',   cls: 'badge-skipped'   },
  CANCELLED:   { label: 'ملغي',        cls: 'badge-cancelled' },
};

const QueueTable = ({ items = [], isLoading, searchTerm = '', onSearchChange, clinicName, onViewPatientFile }) => {
  const { addToast } = useToast();

  const handleCompleteFastQueue = async (clinicId) => {
    try {
      await queueService.completePatient(clinicId);
      addToast('تم إتمام الدور السريع بنجاح', 'success');
      // No need to manually refresh here, socket should handle it or parent will
    } catch (err) {
      addToast('فشل إتمام الدور', 'error');
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(t =>
      (t.fullNumber?.toLowerCase().includes(term)) ||
      (t.patientName?.toLowerCase().includes(term)) ||
      (t.patientPhone?.includes(term))
    );
  }, [items, searchTerm]);

  if (isLoading) {
    return (
      <div className="qt-loading">
        <div className="qt-spinner" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="qt-wrapper">
      {/* Header */}
      <div className="qt-header">
        <div>
          <h3 className="qt-title">
            {clinicName ? `طابور: ${clinicName}` : 'قائمة الانتظار'}
          </h3>
          <span className="qt-count">{items.length} مريض</span>
        </div>
        <input
          className="qt-search"
          type="search"
          placeholder="بحث بالاسم أو رقم التذكرة..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          dir="rtl"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="qt-empty">
          <p>لا يوجد مرضى في الانتظار</p>
        </div>
      ) : (
        <div className="qt-table-wrap">
          <table className="qt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>رقم التذكرة</th>
                <th>اسم المريض</th>
                <th>رقم الهاتف</th>
                <th>الحالة</th>
                <th>الوقت</th>
                <th>إجراءات</th> {/* ✨ العمود الجديد */}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                // الآن سيتطابق بشكل صحيح لأن t.status قادمة كـ WAITING
                const statusInfo = STATUS_MAP[t.status] || { label: t.status, cls: '' };
                return (
                  <tr key={t.id} className={t.status === 'CALLED' ? 'qt-row-called' : ''}>
                    <td className="qt-idx">{idx + 1}</td>
                    <td className="qt-num">{t.fullNumber || `#${t.number}`}</td>
                    <td className="qt-name">{t.patientName || '—'}</td>
                    <td className="qt-phone" dir="ltr">{t.patientPhone || '—'}</td>
                    <td>
                      <span className={`qt-badge ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="qt-time">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    {/* ✨ خلية الإجراءات والزر الجديد */}
                    <td>
                      {t.patientId ? (
                        <button 
                          className="btn" 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.6rem', 
                            background: '#dbeafe', 
                            color: '#1e40af', 
                            border: '1px solid #93c5fd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => onViewPatientFile && onViewPatientFile(t)} 
                          title="عرض الملف الطبي للمريض"
                        >
                          📁 ملف
                        </button>
                      ) : (
                        t.status === 'CALLED' || t.status === 'IN_PROGRESS' || t.status === 'WAITING' ? (
                           <button 
                             className="btn" 
                             style={{ 
                               fontSize: '0.75rem', 
                               padding: '0.25rem 0.6rem', 
                               background: '#d1fae5', 
                               color: '#065f46', 
                               border: '1px solid #6ee7b7',
                               borderRadius: '4px',
                               cursor: 'pointer'
                             }}
                             onClick={() => handleCompleteFastQueue(t.clinicId)}
                             title="إتمام وإنهاء الدور السريع"
                           >
                             ✅ إتمام
                           </button>
                        ) : null
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QueueTable;  