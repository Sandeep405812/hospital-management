import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/api';
import { User, Menu, Bell, Globe, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';

const Navbar = ({ title, onMenuClick }) => {
  const { user } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [notifications, setNotifications] = React.useState([]);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [shakeBell, setShakeBell] = React.useState(false);
  const [timeStr, setTimeStr] = React.useState('');
  const searchInputRef = React.useRef(null);

  // Live Date-Time Clock
  React.useEffect(() => {
    const updateTime = () => {
      const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      };
      setTimeStr(new Date().toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K focus search
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    setShakeBell(true);
    setTimeout(() => setShakeBell(false), 600);
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

  const getBreadcrumbs = () => {
    const path = window.location.pathname;
    if (path === '/dashboard') return 'Home / Dashboard';
    if (path === '/appointments') return 'Home / Appointments';
    if (path === '/symptom-checker') return 'Home / Symptom Checker';
    if (path === '/metrics') return 'Home / Health Tracker';
    if (path === '/doctors') return 'Home / Doctors';
    if (path === '/patients') return 'Home / Patients';
    if (path === '/beds') return 'Home / Ward Bed Map';
    if (path === '/surgery-schedule') return 'Home / Surgery Schedule';
    if (path === '/prescriptions') return 'Home / Prescriptions';
    if (path === '/billing') return 'Home / Billing & Invoices';
    if (path === '/reports') return 'Home / Medical Reports';
    if (path === '/departments') return 'Home / Departments';
    if (path === '/profile') return 'Home / My Profile';
    return 'Home';
  };

  if (!user) return null;

  const navbarStyle = {
    height: '75px',
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

      {/* Title & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1 }} className="navbar-title-container">
        <div style={{
          width: '38px', height: '38px', borderRadius: '8px',
          backgroundColor: 'rgba(13, 148, 136, 0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(13, 148, 136, 0.2)',
          color: 'var(--accent-teal)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3H5C3.34 3 2 4.34 2 6v5c0 1.66 1.34 3 3 3h14Z"/>
            <path d="M12 3v14M8 10h8"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title || 'CareHMS'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{getBreadcrumbs()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Search Bar container */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '220px' }} className="navbar-search-container">
          <span style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <Search size={14} />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search dashboard..."
            style={{
              padding: '0.45rem 2.8rem 0.45rem 2rem',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--glass-border)',
              background: 'rgba(15, 23, 42, 0.4)',
              fontSize: '0.8rem',
              width: '100%',
              outline: 'none',
              color: '#fff',
              transition: 'var(--transition-smooth)'
            }}
          />
          <span style={{
            position: 'absolute',
            right: '8px',
            fontSize: '0.65rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.15rem 0.35rem',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            pointerEvents: 'none'
          }}>
            Ctrl+K
          </span>
        </div>

        {/* Live Clock Display */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }} className="navbar-clock">
          {timeStr}
        </div>

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
            className={shakeBell ? 'shake-bell' : ''}
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

        {/* User profile section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }} className="navbar-user-info">
            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#fff' }}>{user.name}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', display: 'block' }}>{user.role}</span>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)',
            border: '2px solid var(--glass-border)',
            overflow: 'hidden'
          }}>
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
