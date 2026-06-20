import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/api';
import { User, Menu, Bell, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';

const Navbar = ({ title, onMenuClick }) => {
  const { user } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [notifications, setNotifications] = React.useState([]);
  const [bellOpen, setBellOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('hospital_notifications') || '[]');
    setNotifications(saved);

    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn("Invalid BACKEND_URL:", BACKEND_URL);
    }
    const socket = io(socketUrl);

    socket.on('queue-updated', ({ doctorId }) => {
      addNotification(`Live Queue position updated for Doctor.`);
    });

    socket.on('incoming-call', ({ doctorName }) => {
      addNotification(`Incoming call notification from Dr. ${doctorName}`);
    });

    return () => socket.disconnect();
  }, []);

  const addNotification = (text) => {
    setNotifications((prev) => {
      const updated = [{ text, time: Date.now(), read: false }, ...prev].slice(0, 15);
      localStorage.setItem('hospital_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('hospital_notifications');
  };

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
    flexGrow: 1,
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
    <div style={navbarStyle} className="navbar">
      {/* Mobile Hamburger menu toggle */}
      <button 
        onClick={onMenuClick}
        className="navbar-menu-btn"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          marginRight: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Menu size={24} />
      </button>

      <div style={titleStyle} className="navbar-title">{title || 'AS HOSPITAL'}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Language Toggle Trigger */}
        <button 
          onClick={toggleLanguage}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.04)' }}
          title="Switch Language / भाषा बदलें"
        >
          <Globe size={16} style={{ color: 'var(--accent-teal)' }} />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setBellOpen(!bellOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={22} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '16px',
                height: '16px',
                backgroundColor: 'var(--danger)',
                color: 'white',
                fontSize: '0.65rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="notifications-dropdown" style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '290px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-lg)',
              padding: '1rem',
              zIndex: 1000,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <strong>Notifications</strong>
                <button onClick={clearNotifications} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Clear All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>No new notifications</p>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', padding: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ margin: 0, color: 'var(--text-primary)' }}>{notif.text}</p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(notif.time).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={userSectionStyle}>
          <div style={userInfoStyle} className="navbar-user-info">
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', display: 'block' }}>{user.role}</span>
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
    </div>
  );
};

export default Navbar;
