import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/api';
import { User } from 'lucide-react';

const Navbar = ({ title }) => {
  const { user } = useAuth();

  if (!user) return null;

  const navbarStyle = {
    height: '70px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
  };

  const userSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const userInfoStyle = {
    textAlign: 'right',
  };

  const userNameStyle = {
    fontWeight: '600',
    fontSize: '0.95rem',
  };

  const userRoleStyle = {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
    display: 'block',
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-blue)',
    border: '2px solid var(--glass-border)',
  };

  return (
    <div style={navbarStyle}>
      <div style={titleStyle}>{title || 'AS HOSPITAL'}</div>
      <div style={userSectionStyle}>
        <div style={userInfoStyle}>
          <div style={userNameStyle}>{user.name}</div>
          <span style={userRoleStyle}>{user.role}</span>
        </div>
        <div style={avatarStyle}>
          {user.avatar ? (
            <img
              src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
              alt="avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <User size={20} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
