import React from 'react';
import '../styles/CurrentPatientCard.css';

const CurrentPatientCard = ({ number, room, status = 'In Session' }) => {
  return (
    <div className="current-patient-card">
      {/* Animated status bar at the top */}
      <div className="status-indicator-bar"></div>
      
      {/* Visual pulse for calling attention */}
      <div className="pulse-circle"></div>

      <span className="card-label">يتم استدعاء الرقم</span>

      <div className="animated-number-container">
        {/* Using key={number} ensures React re-mounts the element 
            and re-triggers the CSS entry animation when the number changes */}
        <h1 key={number} className="patient-number-tv">
          #{number || '---'}
        </h1>
      </div>

      <div className="room-badge">
        <span className="room-label">يرجى التوجه إلى</span>
        <div>غرفة {room?.toString().replace('Room ', '') || '...'}</div>
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></span>
        <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {status === 'In Session' ? 'قيد المعاينة' : status}
        </span>
      </div>
    </div>
  );
};

export default CurrentPatientCard;
