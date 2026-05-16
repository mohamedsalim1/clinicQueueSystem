import React, { useState, useEffect } from 'react';
import '../styles/AnimatedQueueNumber.css';

const AnimatedQueueNumber = ({ value }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value) {
      // Trigger animation state
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="animated-number-wrapper">
      {/* Background Expand Rings */}
      {isAnimating && <div className="glow-ring active"></div>}
      {isAnimating && <div className="glow-ring active" style={{ animationDelay: '0.2s' }}></div>}

      <h1 
        key={value} 
        className={`huge-number ${isAnimating ? 'animating' : ''}`}
      >
        #{value || '---'}
      </h1>
    </div>
  );
};

export default AnimatedQueueNumber;
