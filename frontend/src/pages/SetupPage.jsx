import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { DEFAULT_HOST, cleanHost, getBrowserHostCandidate } from '../config/network';
import logger from '../utils/logger';

const isTauriEnv = () => typeof window !== 'undefined' && !!window.__TAURI__;

const isValidHost = (value) => {
  const host = cleanHost(value);
  if (!host) return false;
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const namePattern = /^[a-zA-Z0-9.-]+$/;
  if (ipPattern.test(host)) {
    return host.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255);
  }
  return namePattern.test(host);
};

const SetupPage = () => {
  const browserHostCandidate = useMemo(() => getBrowserHostCandidate(), []);
  const appVariant = import.meta.env.VITE_APP_VARIANT || '';
  
  // اقتراح تلقائي: إذا كنا على localhost، الأرجح أننا على جهاز الهوست
  const isOnHostMachine = !browserHostCandidate;

  const [appType, setAppType] = useState(() => {
    // إذا كان البيلد محدد مسبقاً نستخدمه
    if (appVariant) return appVariant;
    const saved = localStorage.getItem('app_type');
    if (saved) return saved;
    return isOnHostMachine ? 'host' : 'reception';
  });

  const [hostIp, setHostIp] = useState(
    localStorage.getItem('host_ip') || browserHostCandidate || DEFAULT_HOST
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const normalizedHost = useMemo(() => cleanHost(hostIp) || DEFAULT_HOST, [hostIp]);
  
  // حساب رابط الفحص بناءً على نوع التطبيق وبيئة Tauri
  const hostUrl = useMemo(() => {
    const isTauri = isTauriEnv();
    if (appType === 'host' && (isOnHostMachine || isTauri)) {
      return 'http://127.0.0.1:3000';
    }
    return normalizedHost ? `http://${normalizedHost}:3000` : '';
  }, [appType, isOnHostMachine, normalizedHost]);

  useEffect(() => {
    if (browserHostCandidate && appType === 'reception') {
      handleTestConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTestConnection = async () => {
    const isTauri = isTauriEnv();
    let targetHost = cleanHost(hostIp) || DEFAULT_HOST;
    let testUrl = `http://${targetHost}:3000`;

    // إصلاح Tauri: جهاز الهوست يفحص دائماً على 127.0.0.1
    if (appType === 'host' && (isOnHostMachine || isTauri)) {
      targetHost = '127.0.0.1';
      testUrl = 'http://127.0.0.1:3000';
    }

    // إصلاح إضافي لمنع فحص tauri.localhost
    if (isTauri && testUrl.includes('tauri.localhost')) {
      testUrl = 'http://127.0.0.1:3000';
    }

    if (appType !== 'host' || !isOnHostMachine) {
      if (!isValidHost(targetHost)) {
        setTestResult({ success: false, msg: 'أدخل IP أو اسم جهاز صحيح مثل 192.168.1.100' });
        return false;
      }
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await axios.get(`${testUrl}/health`, { timeout: 5000 });
      const healthy = response.status === 200 && response.data.database === 'CONNECTED';
      
      const resultMsg = healthy
        ? `✅ تم الاتصال بالخادم وقاعدة البيانات. IP الشبكة: ${response.data.lanIp || targetHost}`
        : `⚠️ وصلنا للخادم لكن قاعدة البيانات غير متصلة: ${response.data.dbError || 'غير معروف'}`;

      setTestResult({ success: healthy, msg: resultMsg });
      logger.info(`[Setup] Connection test to ${testUrl}: ${healthy ? 'OK' : 'DB_DISCONNECTED'}`);
      return healthy;
    } catch (error) {
      const msg = (appType === 'host' && isOnHostMachine)
        ? 'فشل الاتصال بالخادم المحلي. تأكد أن السيرفر يعمل على هذا الجهاز.'
        : 'فشل الاتصال. تأكد أن جهاز الهوست يعمل وأن الجهازين على نفس الشبكة.';
      setTestResult({ success: false, msg });
      logger.error(`[Setup] Connection test failed: ${error.message}`);
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (appType === 'reception') {
      const alreadyTested = testResult?.success && cleanHost(hostIp) === normalizedHost;
      const ok = alreadyTested ? true : await handleTestConnection();
      if (!ok) return;

      localStorage.setItem('host_ip', normalizedHost);
      localStorage.setItem('app_type', 'reception');
    } else {
      // وضع الهوست
      const alreadyTested = testResult?.success;
      const ok = alreadyTested ? true : await handleTestConnection();
      
      // في بيئة Tauri Host، نتجاوز الفحط إذا فشل لأننا متأكدون أن السيرفر يعمل خلف الكواليس
      if (!ok && !isTauriEnv()) {
        return; 
      }

      localStorage.removeItem('host_ip');
      localStorage.setItem('app_type', 'host');
      localStorage.setItem('host_ip', '127.0.0.1'); // ضروري للطباعة والاتصال الداخلي
    }

    logger.info(`[Setup] Saved configuration: app_type=${appType}`);
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      display: 'grid',
      placeItems: 'center',
      padding: '1rem',
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
    }}>
      <main style={{
        width: 'min(760px, 100%)',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.10)',
        overflow: 'hidden'
      }}>
        <section style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 950 }}>تهيئة اتصال نظام داريا الطبي</h1>
          <p style={{ margin: '.45rem 0 0', color: '#64748b', lineHeight: 1.7 }}>
            اختر دور هذا الجهاز ثم احفظ الإعداد. جهاز الهوست يعمل كسيرفر، وباقي الأجهزة (العميل) تتصل به.
          </p>
        </section>

        <section style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
          
          {/* أزرار اختيار الدور (يظهران دائماً) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <button
              type="button"
              onClick={() => { setAppType('host'); setTestResult(null); }}
              style={{
                textAlign: 'right',
                border: appType === 'host' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                background: appType === 'host' ? '#f0fdfa' : '#ffffff',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: '0.2s'
              }}
            >
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '.3rem' }}>🖥️ جهاز الهوست (الخادم)</strong>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>يشغل السيرفر وقاعدة البيانات محلياً ويتصل بالطابعة.</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setAppType('reception');
                if (!hostIp) setHostIp(browserHostCandidate || DEFAULT_HOST);
                setTestResult(null);
              }}
              style={{
                textAlign: 'right',
                border: appType === 'reception' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                background: appType === 'reception' ? '#f0fdfa' : '#ffffff',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: '0.2s'
              }}
            >
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '.3rem' }}>📱 جهاز العميل (الاستقبال)</strong>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>يتصل بجهاز الهوست عبر الشبكة المحلية.</span>
            </button>
          </div>

          {/* إعدادات جهاز العميل (إدخال الـ IP) */}
          {appType === 'reception' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', background: '#f8fafc' }}>
              <label style={{ display: 'block', fontWeight: 850, color: '#334155', marginBottom: '.45rem' }}>
                عنوان IP جهاز الهوست
              </label>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <input
                  value={hostIp}
                  onChange={(event) => {
                    setHostIp(event.target.value);
                    setTestResult(null);
                  }}
                  placeholder="192.168.1.120"
                  dir="ltr"
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    height: '42px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0 .75rem',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{
                    height: '42px',
                    border: '1px solid #0f766e',
                    background: '#0f766e',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0 1rem',
                    fontWeight: 850,
                    cursor: isTesting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isTesting ? 'جاري الفحص...' : 'فحص الاتصال'}
                </button>
              </div>
              {hostUrl && (
                <p style={{ margin: '.65rem 0 0', color: '#64748b', fontSize: '.85rem', direction: 'ltr', textAlign: 'left' }}>
                  {hostUrl}/health
                </p>
              )}
            </div>
          )}

          {/* رسالة توضيحية لجهاز الهوست */}
          {appType === 'host' && (
            <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', borderRadius: '8px', padding: '1rem', lineHeight: 1.7 }}>
              <strong>ملاحظة لجهاز الهوست:</strong> تأكد أن السيرفر يعمل على هذا الجهاز. الأجهزة الأخرى ستستخدم IP هذا الجهاز للاتصال. يفضل فحص الاتصال للتأكد من سلامة قاعدة البيانات.
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{
                  height: '38px',
                  border: '1px solid #1e40af',
                  background: '#1e40af',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  fontWeight: 850,
                  cursor: isTesting ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  display: 'block'
                }}
              >
                {isTesting ? 'جاري الفحص...' : 'فحص قاعدة البيانات محلياً'}
              </button>
            </div>
          )}

          {/* نتيجة الفحص */}
          {testResult && (
            <div style={{
              border: `1px solid ${testResult.success ? '#86efac' : '#fecaca'}`,
              background: testResult.success ? '#f0fdf4' : '#fef2f2',
              color: testResult.success ? '#166534' : '#991b1b',
              borderRadius: '8px',
              padding: '.85rem',
              fontWeight: 750
            }}>
              {testResult.msg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            style={{
              height: '46px',
              border: '0',
              borderRadius: '8px',
              background: '#0f766e',
              color: '#ffffff',
              fontWeight: 950,
              cursor: 'pointer',
              fontSize: '1rem',
              marginTop: '0.5rem'
            }}
          >
            حفظ التهيئة ودخول النظام
          </button>
        </section>
      </main>
    </div>
  );
};

export default SetupPage;