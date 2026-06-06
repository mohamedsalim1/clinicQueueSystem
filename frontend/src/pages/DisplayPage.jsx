/**
 * DisplayPage.jsx
 *
 * شاشة العرض الرئيسية للتلفزيون:
 * - بطاقة كبيرة لكل عيادة تعرض: الرقم المُنادَى + قائمة الانتظار
 * - إعلان صوتي احترافي (تشغيل ملفات MP3 بالتسلسل)
 * - شريط أخبار متحرك في الأسفل
 * - تحديث لحظي عبر Socket.io
 * - وضع ملء الشاشة
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useVoiceAnnouncements from '../hooks/useVoiceAnnouncements';
import { useSocket } from '../context/SocketContext';
import queueService from '../services/queueService';
import { getApiBaseURL } from '../config/network';
import logger from '../utils/logger';
import '../styles/DisplayPage.css';

const API = getApiBaseURL();
const CALL_POPUP_DURATION_MS = 6500;
const CALL_HIGHLIGHT_DURATION_MS = 3000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
];

const arabicNumber = new Intl.NumberFormat('ar-SA', { useGrouping: false });

const getDatePart = (parts, type) => parts.find(part => part.type === type)?.value;

const formatHijriDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date);

  const day = Number(getDatePart(parts, 'day'));
  const month = Number(getDatePart(parts, 'month'));
  const year = Number(getDatePart(parts, 'year'));

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return `${arabicNumber.format(day)} ${HIJRI_MONTHS[month - 1]} ${arabicNumber.format(year)} هـ`;
};

// ——— ساعة رقمية ———
const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const gregorianDate = time.toLocaleDateString('ar-SY-u-ca-gregory', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const hijriDate = formatHijriDate(time);

  return (
    <div className="dp-clock">
      <div className="dp-time">
        {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
      <div className="dp-date">
        <span>هجري: {hijriDate}</span>
        <span>ميلادي: {gregorianDate}</span>
      </div>
    </div>
  );
};

// ——— بطاقة عيادة واحدة ———
const ClinicCard = ({ clinicState, isHighlighted }) => {
  const { clinic, calledTicket, waitingTickets, waitingCount } = clinicState;

  return (
    <div className={`dp-clinic-card ${isHighlighted ? 'highlighted' : ''}`}>
      {/* رأس البطاقة */}
      <div className="dp-card-header">
        <span className="dp-card-prefix">{clinic.prefix}</span>
        <span className="dp-card-name">{clinic.name}</span>
        <span className={`dp-card-status ${calledTicket ? 'calling' : waitingCount > 0 ? 'waiting' : 'idle'}`}>
          {calledTicket ? 'تم النداء' : waitingCount > 0 ? 'انتظار' : 'فارغ'}
        </span>
      </div>

      {/* الرقم المُنادَى */}
      <div className="dp-called-section">
        <div className="dp-called-label">تم النداء</div>
        <div className="dp-called-number">
          {calledTicket ? calledTicket.fullNumber : (
            <span className="dp-idle-dash">—</span>
          )}
        </div>
        {calledTicket?.patientName && (
          <div className="dp-called-patient">{calledTicket.patientName}</div>
        )}
      </div>

      {/* قائمة الانتظار */}
      <div className="dp-waiting-section">
        <div className="dp-waiting-label">
          الانتظار <span className="dp-waiting-count">({waitingCount})</span>
        </div>
        <div className="dp-waiting-list">
          {waitingTickets.length === 0 ? (
            <span className="dp-no-waiting">لا يوجد انتظار</span>
          ) : (
            waitingTickets.slice(0, 4).map(t => (
              <span key={t.id} className="dp-waiting-num">{t.fullNumber}</span>
            ))
          )}
          {waitingCount > 4 && (
            <span className="dp-waiting-more">+{waitingCount - 4} آخرون</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ——— الصفحة الرئيسية ———
const DisplayPage = () => {
  const [allClinicsState, setAllClinicsState] = useState([]);
  const [tickerText,      setTickerText]      = useState('مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل');
  const [displayTitle,    setDisplayTitle]    = useState('مركز داريا الطبي');
  const [displaySub,      setDisplaySub]      = useState('Daraya Medical Center');
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [highlightedId,   setHighlightedId]   = useState(null);
  const [callPopup,       setCallPopup]       = useState(null);
  
  // ——— إعدادات صفحات العرض ———
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;
  const allClinicsStateRef = useRef(allClinicsState);

  // حفظ حالة الصوت في localStorage عشان ما يضطر يضغط الزر كل مرة يفتح الصفحة
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('clinic_sound_enabled') === 'true'
  );
  // ref يحمل القيمة الحالية — يُقرأ من داخل مستمعات الـ Socket بدون إعادة تسجيلها
  const soundEnabledRef = useRef(soundEnabled);
  const containerRef = useRef(null);
  const callPopupTimerRef = useRef(null);
  const callHighlightTimerRef = useRef(null);
  const callQueueRef = useRef([]);
  const isShowingCallRef = useRef(false);
  const callRunIdRef = useRef(0);

  const { announce, stop } = useVoiceAnnouncements();
  const { joinDisplay, subscribeTo, isConnected } = useSocket();

  // جلب الحالة الكاملة
  const fetchAll = useCallback(async () => {
    try {
      const data = await queueService.getAllDisplay();
      if (data.allClinicsState) setAllClinicsState(data.allClinicsState);
    } catch (err) {
      logger.error('[Display] fetchAll error:', err);
    }
  }, []);

  // جلب إعدادات الشريط
  const fetchSettings = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/settings`);
      const data = await res.json();
      if (data.tickerText) setTickerText(data.tickerText);
      if (data.clinicTitle) setDisplayTitle(data.clinicTitle);
      if (data.clinicSubtitle) setDisplaySub(data.clinicSubtitle);
    } catch (err) {
      logger.warn('[Display] fetchSettings error:', err);
    }
  }, []);

  // مزامنة الـ ref مع state الصوت عند كل تغيير
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // مزامنة الـ ref مع حالة العيادات
  useEffect(() => {
    allClinicsStateRef.current = allClinicsState;
  }, [allClinicsState]);

  const showNextCall = useCallback(async () => {
    if (isShowingCallRef.current) return;

    const payload = callQueueRef.current.shift();
    if (!payload) return;

    isShowingCallRef.current = true;
    const runId = ++callRunIdRef.current;
    setCallPopup(payload);
    setHighlightedId(payload.clinicId);

    if (callHighlightTimerRef.current) clearTimeout(callHighlightTimerRef.current);
    callHighlightTimerRef.current = setTimeout(() => {
      setHighlightedId(null);
      callHighlightTimerRef.current = null;
    }, CALL_HIGHLIGHT_DURATION_MS);

    // البحث عن الصفحة التي تحتوي على العيادة المناداة والتبديل إليها تلقائياً
    const clinicIndex = allClinicsStateRef.current.findIndex(cs => cs.clinic.id === payload.clinicId);
    if (clinicIndex !== -1) {
      const targetPage = Math.floor(clinicIndex / itemsPerPage);
      setCurrentPage(targetPage);
    }

    if (callPopupTimerRef.current) clearTimeout(callPopupTimerRef.current);
    await Promise.all([
      wait(CALL_POPUP_DURATION_MS),
      payload.audioSequence && soundEnabledRef.current ? announce(payload.audioSequence) : Promise.resolve()
    ]);

    if (callRunIdRef.current !== runId) return;

    setCallPopup(null);
    isShowingCallRef.current = false;
    callPopupTimerRef.current = null;
    showNextCall();
  }, [announce]);

  // ——— التهيئة والاستماع للسوكيتس (يُسجَّل مرة واحدة فقط) ———
  useEffect(() => {
    joinDisplay();
    fetchAll();
    fetchSettings();

    // 1. تحديث حالة جميع العيادات
    const unsubState = subscribeTo('all-clinics-state', (payload) => {
      if (payload) setAllClinicsState(payload);
    });

    // 2. نداء الرقم الجديد — نقرأ soundEnabledRef.current لا soundEnabled
    //    حتى لا نضطر لإعادة تسجيل المستمع في كل مرة يتغير فيها الصوت
    const unsubCall = subscribeTo('current-number', (payload) => {
      if (!payload) {
        callQueueRef.current = [];
        isShowingCallRef.current = false;
        callRunIdRef.current++;
        stop();
        setCallPopup(null);
        setHighlightedId(null);
        if (callPopupTimerRef.current) clearTimeout(callPopupTimerRef.current);
        if (callHighlightTimerRef.current) clearTimeout(callHighlightTimerRef.current);
        return;
      }
      callQueueRef.current.push(payload);
      showNextCall();
    });

    return () => {
      unsubState?.();
      unsubCall?.();
      if (callPopupTimerRef.current) clearTimeout(callPopupTimerRef.current);
      if (callHighlightTimerRef.current) clearTimeout(callHighlightTimerRef.current);
      callRunIdRef.current++;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinDisplay, subscribeTo, fetchAll, fetchSettings, showNextCall, stop]);

  // ——— تأثير التنقل التلقائي بين الصفحات ———
  const totalPages = Math.ceil(allClinicsState.length / itemsPerPage);
  useEffect(() => {
    if (allClinicsState.length <= itemsPerPage) {
      setCurrentPage(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 8000); // الانتقال كل 8 ثوانٍ
    return () => clearInterval(interval);
  }, [allClinicsState.length, totalPages]);

  // ملء الشاشة
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const enableSound = () => {
    setSoundEnabled(true);
    soundEnabledRef.current = true;
    localStorage.setItem('clinic_sound_enabled', 'true');
    // تشغيل ملف موجود فعلاً لكسر حماية الـ Autoplay في المتصفح
    // نستخدم /audio/numbers/1.wav لأنه مضمون الوجود
    announce(['/audio/numbers/1.wav']);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="dp-container" ref={containerRef} dir="rtl">
      {/* ——— رأس الشاشة ——— */}
      <header className="dp-header">
        <div className="dp-header-logo">
          <div>
            <div className="dp-header-title">{displayTitle}</div>
            <div className="dp-header-sub">{displaySub}</div>
          </div>
        </div>

        <Clock />

        <div className="dp-header-actions">
          {totalPages > 1 && (
            <div className="dp-page-indicator">
              صفحة {currentPage + 1} من {totalPages}
            </div>
          )}
          <div className={`dp-conn-indicator ${isConnected ? 'ok' : 'err'}`}>
            <span className="dp-conn-dot" />
            {isConnected ? 'متصل' : 'غير متصل'}
          </div>
          <button className="dp-fs-btn" onClick={toggleFullscreen} title="ملء الشاشة">
            {isFullscreen ? 'خروج' : 'ملء'}
          </button>
        </div>
      </header>

      {/* ——— بوب أب النداء بدل الشريط العلوي ——— */}
      {callPopup && (
        <div className="dp-call-popup-wrap" aria-live="assertive">
          <div className="dp-call-popup">
            <div className="dp-card-header">
              <span className="dp-card-prefix">{callPopup.clinic?.prefix || callPopup.fullNumber?.[0]}</span>
              <span className="dp-card-name">{callPopup.clinicName}</span>
              <span className="dp-card-status calling">تم النداء</span>
            </div>
            <div className="dp-called-section dp-popup-called-section">
              <div className="dp-called-label">الرقم المنادى</div>
              <div className="dp-called-number dp-popup-number">{callPopup.fullNumber}</div>
              {callPopup.patientName && (
                <div className="dp-called-patient">{callPopup.patientName}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ——— بطاقات العيادات ——— */}
      <main className="dp-clinics-grid">
        {allClinicsState.length === 0 ? (
          <div className="dp-no-data">
            <div className="dp-no-data-text">مرحباً بكم في مركز داريا الطبي</div>
            <div className="dp-no-data-sub">جاري تحميل بيانات العيادات...</div>
          </div>
        ) : (
          allClinicsState
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map(cs => (
              <ClinicCard
                key={cs.clinic.id}
                clinicState={cs}
                isHighlighted={highlightedId === cs.clinic.id}
              />
            ))
        )}
      </main>

      {/* ——— شريط الأخبار المتحرك ——— */}
      <footer className="dp-ticker-bar">
        <div className="dp-ticker-label">إشعارات</div>
        <div className="dp-ticker-track">
          <div className="dp-ticker-content">
            {tickerText} &nbsp;•&nbsp; {tickerText} &nbsp;•&nbsp; {tickerText}
          </div>
        </div>
      </footer>

      {/* ——— زر تفعيل الصوت (عائم) ——— */}
      {!soundEnabled && (
        <button className="dp-enable-sound-btn" onClick={enableSound}>
          🔊 اضغط هنا لتفعيل الصوت
        </button>
      )}
    </div>
  );
};

export default DisplayPage;
