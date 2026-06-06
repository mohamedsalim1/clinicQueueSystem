import React, { useState, useRef, useEffect } from 'react';
import '../styles/SmartDropdown.css'; // سننشئه بعد قليل

const SmartDropdown = ({ options, value, onChange, placeholder, required, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // فلترة الخيارات بناءً على ما يكتبه المستخدم
  const normalizedValue = value.trim().toLowerCase();
  const filteredOptions = options.filter(opt => 
    !normalizedValue || opt.toLowerCase().includes(normalizedValue)
  );

  // هل النص المكتوب غير موجود في القائمة؟ (لعرض خيار الإضافة)
  const showAddOption = value && !options.includes(value);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="sdd-container" ref={ref}>
      {label && <label className="sdd-label">{label} {required && <span className="sdd-required">*</span>}</label>}
      <div className="sdd-input-wrapper">
        <input
          type="text"
          className="sdd-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
        />
        <button type="button" className="sdd-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <div className="sdd-menu">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={idx}
                className={`sdd-option ${opt === value ? 'active' : ''}`}
                onMouseDown={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))
          ) : (
            !showAddOption && <div className="sdd-empty">لا توجد نتائج</div>
          )}
          
          {showAddOption && (
            <div
              className="sdd-option sdd-add-option"
              onMouseDown={() => handleSelect(value)}
            >
              <span className="sdd-plus">+</span> إضافة "{value}" كخيار جديد
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartDropdown;
