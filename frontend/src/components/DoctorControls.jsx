/**
 * DoctorControls.jsx — أزرار التحكم في الطابور
 */

import React from 'react';

const DoctorControls = ({ isLoading, hasCurrentPatient, onNext, onRecall, onSkip, onComplete }) => {
  return (
    <div className="dc-controls">
      {/* التالي — الزر الرئيسي */}
      <button
        className="dc-btn dc-next"
        onClick={onNext}
        disabled={isLoading}
        title="[N] استدعاء التالي"
      >
        <span className="dc-btn-text">التالي</span>
        <kbd className="dc-kbd">N</kbd>
      </button>

      <div className="dc-secondary">
        <button
          className="dc-btn dc-recall"
          onClick={onRecall}
          disabled={isLoading || !hasCurrentPatient}
          title="[R] إعادة النداء"
        >
          إعادة نداء <kbd className="dc-kbd">R</kbd>
        </button>

        <button
          className="dc-btn dc-skip"
          onClick={onSkip}
          disabled={isLoading || !hasCurrentPatient}
          title="[S] تخطي"
        >
          تخطي <kbd className="dc-kbd">S</kbd>
        </button>

        <button
          className="dc-btn dc-complete"
          onClick={onComplete}
          disabled={isLoading || !hasCurrentPatient}
          title="[C] إتمام الزيارة"
        >
          إتمام <kbd className="dc-kbd">C</kbd>
        </button>
      </div>
    </div>
  );
};

export default DoctorControls;
