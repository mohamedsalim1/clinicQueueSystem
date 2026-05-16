import React from 'react';

/**
 * Reusable Skeleton loader for clinic components
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s infinite linear'
      }}
    />
  );
};

/**
 * Standard Empty State component
 */
export const EmptyState = ({ title, message, icon = '' }) => {
  return (
    <div style={{ 
      padding: '4rem 2rem', 
      textAlign: 'center', 
      background: 'white', 
      borderRadius: '16px', 
      border: '2px dashed #e2e8f0' 
    }}>
      {icon && <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>}
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{title}</h3>
      <p style={{ margin: 0, color: '#64748b' }}>{message}</p>
    </div>
  );
};

// Add global skeleton animation to design system or here
const style = document.createElement('style');
style.textContent = `
  @keyframes skeleton-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
document.head.appendChild(style);
