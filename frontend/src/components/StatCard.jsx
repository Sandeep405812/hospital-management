import React, { useState, useEffect } from 'react';

const StatCard = ({ title, value, icon, colorClass = 'blue', change, isIncrease = true, description }) => {
  const [displayValue, setDisplayValue] = useState('0');

  const colorMap = {
    blue: '#3b82f6',
    teal: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
  };

  const accentColor = colorMap[colorClass] || '#3b82f6';

  // Animated Count-Up Logic
  useEffect(() => {
    const rawVal = String(value);
    const cleanNumStr = rawVal.replace(/[^0-9]/g, '');
    const numValue = Number(cleanNumStr);

    if (isNaN(numValue) || numValue === 0) {
      setDisplayValue(rawVal);
      return;
    }

    let start = 0;
    const duration = 1000; // ms
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quad
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * numValue);

      if (rawVal.startsWith('₹')) {
        setDisplayValue(`₹${currentVal.toLocaleString('en-IN')}`);
      } else {
        setDisplayValue(currentVal.toLocaleString('en-IN'));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(rawVal);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const renderSparkline = (color) => {
    return (
      <svg width="55" height="20" viewBox="0 0 55 20" style={{ overflow: 'visible', opacity: 0.8, marginLeft: '0.5rem' }}>
        <path
          d="M0,15 Q12,2 25,12 T55,5"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M0,15 Q12,2 25,12 T55,5 L55,20 L0,20 Z"
          fill={`url(#sparkGrad-${colorClass})`}
          style={{ opacity: 0.08 }}
        />
        <defs>
          <linearGradient id={`sparkGrad-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div 
      className="stat-card" 
      style={{ 
        borderLeft: `4px solid ${accentColor}`,
        padding: '28px'
      }}
    >
      <div className="stat-info" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.78rem' }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{displayValue}</h3>
          {renderSparkline(accentColor)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {change && (
            <div style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isIncrease ? 'var(--success)' : 'var(--danger)',
              backgroundColor: isIncrease ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              marginTop: '0.4rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15rem'
            }}>
              <span>{isIncrease ? '▲' : '▼'}</span>
              <span>{change}</span>
            </div>
          )}

          {description && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
              {description}
            </span>
          )}
        </div>
      </div>
      <div 
        className={`stat-icon ${colorClass}`}
        style={{
          backgroundColor: `rgba(${colorClass === 'blue' ? '59, 130, 246' : colorClass === 'teal' ? '16, 185, 129' : colorClass === 'warning' ? '245, 158, 11' : '244, 63, 94'}, 0.15)`,
          color: accentColor,
          width: '52px',
          height: '52px',
          borderRadius: '12px'
        }}
      >
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
