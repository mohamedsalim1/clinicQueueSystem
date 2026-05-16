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
import '../styles/DisplayPage.css';

const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  if (typeof window !== 'undefined' && window.__TAURI__) return 'http://localhost:3000';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

const API = `${getBackendUrl()}/api`;

// ——— ساعة رقمية ———
const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="dp-clock">
      <div className="dp-time">
        {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
      <div className="dp-date">
        {time.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};

// ——— بطاقة عيادة واحدة ———
const ClinicCard = ({ clinicState, isHighlighted }) => {
  const { clinic, calledTicket, waitingTickets, waitingCount } = clinicState;
  const prevCalledRef = useRef(null);
  const [flash, setFlash] = useState(false);

  // وميض عند تغيّر الرقم المُنادَى
  useEffect(() => {
    if (calledTicket && calledTicket.id !== prevCalledRef.current) {
      prevCalledRef.current = calledTicket.id;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [calledTicket]);

  return (
    <div className={`dp-clinic-card ${isHighlighted ? 'highlighted' : ''} ${flash ? 'flash' : ''}`}>
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
        <div className={`dp-called-number ${flash ? 'dp-flash-anim' : ''}`}>
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
  const [lastCalled,      setLastCalled]      = useState(null);
  const [tickerText,      setTickerText]      = useState('مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل');
  const [displayTitle,    setDisplayTitle]    = useState('مركز داريا الطبي');
  const [displaySub,      setDisplaySub]      = useState('Daraya Medical Center');
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [highlightedId,   setHighlightedId]   = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const containerRef = useRef(null);

  const { announce } = useVoiceAnnouncements(); // تم إزالة rate لأننا نستخدم ملفات جاهزة
  const { joinDisplay, subscribeTo, isConnected } = useSocket();

  // جلب الحالة الكاملة
  const fetchAll = useCallback(async () => {
    try {
      const data = await queueService.getAllDisplay();
      if (data.allClinicsState) setAllClinicsState(data.allClinicsState);
    } catch (err) {
      console.error('[Display] Fetch error:', err);
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
    } catch (_) {}
  }, []);

  // ——— التهيئة والاستماع للسوكيتس ———
  useEffect(() => {
    joinDisplay();     // تفعيل السوكيت والانضمام لغرفة العرض
    fetchAll();        // جلب البيانات الأولية
    fetchSettings();   // جلب الإعدادات الأولية

    // 1. الاستماع لتحديث حالة جميع العيادات (لتحديث البطاقات وقوائم الانتظار)
    const unsubState = subscribeTo('all-clinics-state', (payload) => {
      if (payload) setAllClinicsState(payload);
    });

    // 2. الاستماع لنداء الرقم الجديد (للإعلان الصوتي وشريط آخر نداء والوميض)
    const unsubCall = subscribeTo('current-number', (payload) => {
      if (payload) {
        setLastCalled(payload);
        setHighlightedId(payload.clinicId);
        
        // تشغيل تسلسل الملفات الصوتية القادمة من الباك إند
        if (payload.audioSequence && soundEnabled) {
          announce(payload.audioSequence);
        }

        setTimeout(() => setHighlightedId(null), 3000);
      }
    });

    // تنظيف المستمعات عند إغلاق المكون
    return () => {
      unsubState?.();
      unsubCall?.();
    };
  }, [joinDisplay, subscribeTo, fetchAll, fetchSettings, announce, soundEnabled]);

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
    // تشغيل ملف صوتي تجريبي لكسر حماية المتصفح
    // تأكد من وجود ملف باسم sound_enabled.mp3 في مجلد public/audio/phrases/
    announce(['/audio/phrases/sound_enabled.mp3']);
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
          <div className={`dp-conn-indicator ${isConnected ? 'ok' : 'err'}`}>
            <span className="dp-conn-dot" />
            {isConnected ? 'متصل' : 'غير متصل'}
          </div>
          <button className="dp-fs-btn" onClick={toggleFullscreen} title="ملء الشاشة">
            {isFullscreen ? 'خروج' : 'ملء'}
          </button>
        </div>
      </header>

      {/* ——— آخر نداء بارز (شريط عريض) ——— */}
      {lastCalled && (
        <div className="dp-last-call-banner">
          <span className="dp-lc-label">آخر نداء:</span>
          <span className="dp-lc-number">{lastCalled.fullNumber}</span>
          <span className="dp-lc-clinic">{lastCalled.clinicName}</span>
          {lastCalled.patientName && (
            <span className="dp-lc-patient">— {lastCalled.patientName}</span>
          )}
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
          allClinicsState.map(cs => (
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