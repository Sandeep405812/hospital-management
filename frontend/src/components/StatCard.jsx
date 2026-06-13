import React from 'react';

const StatCard = ({ title, value, icon, colorClass = 'blue', description }) => {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{title}</p>
        <h3>{value}</h3>
        {description && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {description}
          </span>
        )}
      </div>
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
    </div>
  );
};

export default StatCard;
