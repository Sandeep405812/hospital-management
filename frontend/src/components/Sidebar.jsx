import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, BACKEND_URL } from '../utils/api';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  User,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  CreditCard,
  Layers,
  LogOut,
  FolderOpen,
  Activity,
  Heart,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Theme support
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch pending appointments for real-time red dot badge count
  const fetchPendingCount = async () => {
    try {
      const apps = await api.get('/appointments');
      const pending = apps.filter(a => a.status === 'pending').length;
      setPendingCount(pending);
    } catch (err) {
      console.error('Failed to load appointments for sidebar badge', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingCount();

      // Realtime badge updates via Socket connection
      let socketUrl = BACKEND_URL;
      try {
        socketUrl = new URL(BACKEND_URL).origin;
      } catch (e) {
        console.warn("Invalid BACKEND_URL:", BACKEND_URL);
      }
      const socket = io(socketUrl);
      socket.on('queue-updated', fetchPendingCount);
      return () => socket.disconnect();
    }
  }, [user]);

  if (!user) return null;

  const links = [
    {
      to: '/dashboard',
      label: t('dashboard'),
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
      group: 'management'
    },
    {
      to: '/appointments',
      label: t('appointments'),
      icon: <Calendar size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
      group: 'management',
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      to: '/symptom-checker',
      label: t('symptomChecker'),
      icon: <Heart size={20} />,
      roles: ['patient'],
      group: 'management'
    },
    {
      to: '/metrics',
      label: t('healthTracker'),
      icon: <Activity size={20} />,
      roles: ['patient'],
      group: 'management'
    },
    {
      to: '/doctors',
      label: t('doctors'),
      icon: <Stethoscope size={20} />,
      roles: ['admin', 'patient', 'receptionist'],
      group: 'management'
    },
    {
      to: '/patients',
      label: t('patients'),
      icon: <Users size={20} />,
      roles: ['admin', 'doctor', 'receptionist'],
      group: 'management'
    },
    {
      to: '/beds',
      label: t('beds'),
      icon: <Layers size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
      group: 'management'
    },
    {
      to: '/surgery-schedule',
      label: t('surgeries'),
      icon: <Calendar size={20} />,
      roles: ['admin', 'doctor', 'receptionist'],
      group: 'management'
    },
    {
      to: '/billing',
      label: t('billingInvoices'),
      icon: <CreditCard size={20} />,
      roles: ['admin', 'patient', 'receptionist'],
      group: 'finance'
    },
    {
      to: '/prescriptions',
      label: t('prescriptions'),
      icon: <FileText size={20} />,
      roles: ['admin', 'doctor', 'patient'],
      group: 'finance'
    },
    {
      to: '/reports',
      label: t('medicalReports'),
      icon: <FolderOpen size={20} />,
      roles: ['patient'],
      group: 'finance'
    },
    {
      to: '/departments',
      label: t('departments'),
      icon: <Layers size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
      group: 'finance'
    },
    {
      to: '/profile',
      label: t('myProfile'),
      icon: <User size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
      group: 'system'
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(user.role));

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: isCollapsed ? '80px' : '260px',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: isCollapsed ? '1rem 0.5rem' : '1.5rem',
    zIndex: 100,
    transition: 'var(--transition-smooth)',
  };

  const logoStyle = {
    fontSize: '1.25rem',
    fontWeight: '800',
    marginBottom: '1.5rem',
    background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-teal) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    gap: '0.5rem',
  };

  const navLinksStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: '1rem',
    paddingRight: '0.2rem'
  };

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    gap: isCollapsed ? '0' : '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
    fontWeight: isActive ? '600' : '400',
    transition: 'var(--transition-smooth)',
    position: 'relative'
  });

  const themeToggleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--glass-border)',
    width: '100%',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    fontWeight: '600',
    transition: 'var(--transition-smooth)',
  };

  const logoutButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    gap: isCollapsed ? '0' : '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--danger)',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'var(--transition-smooth)',
  };

  // Grouped link elements
  const renderLinkGroup = (groupKey, label) => {
    const groupItems = filteredLinks.filter(item => item.group === groupKey);
    if (groupItems.length === 0) return null;

    return (
      <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {!isCollapsed && (
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '1rem',
            marginBottom: '0.4rem',
            paddingLeft: '0.5rem'
          }}>
            {label}
          </div>
        )}
        {groupItems.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => isActive ? 'sidebar-glow-link' : ''}
            style={({ isActive }) => linkStyle(isActive)}
            onClick={onClose}
            title={isCollapsed ? link.label : ''}
          >
            {link.icon}
            {!isCollapsed && <span>{link.label}</span>}
            
            {/* Realtime Pending Badge / Notification Dot */}
            {link.badge && (
              <span style={{
                position: 'absolute',
                top: isCollapsed ? '2px' : '50%',
                right: isCollapsed ? '2px' : '10px',
                transform: isCollapsed ? 'none' : 'translateY(-50%)',
                width: isCollapsed ? '8px' : '18px',
                height: isCollapsed ? '8px' : '18px',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                fontSize: '0.65rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.4)'
              }}>
                {!isCollapsed && link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    );
  };

  return (
    <div style={sidebarStyle} className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="sidebar-close-btn"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <X size={24} />
      </button>

      {/* Hospital Logo branding */}
      <div style={logoStyle}>
        <span>🏥</span>
        {!isCollapsed && <span style={{ letterSpacing: '-0.5px' }}>AS HOSPITAL</span>}
      </div>

      {/* User profile demographics badge */}
      {!isCollapsed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--glass-border)',
          marginBottom: '1rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)',
            border: '2px solid var(--accent-blue)',
            fontWeight: 'bold',
            overflow: 'hidden',
            fontSize: '0.85rem'
          }}>
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</div>
            <span style={{
              fontSize: '0.6rem',
              background: user.role === 'admin' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: user.role === 'admin' ? 'var(--danger)' : 'var(--accent-blue)',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: 700,
              display: 'inline-block',
              marginTop: '0.15rem'
            }}>{user.role}</span>
          </div>
        </div>
      )}

      {/* Scrollable links */}
      <nav style={navLinksStyle}>
        {renderLinkGroup('management', 'Clinic & Management')}
        {renderLinkGroup('finance', 'Finance & Bills')}
        {renderLinkGroup('system', 'Personal & System')}
      </nav>

      {/* Collapse/Expand toggle drawer button */}
      <button 
        onClick={() => {
          const nextCollapse = !isCollapsed;
          setIsCollapsed(nextCollapse);
          
          // Adjust layout wrapper margins dynamically
          const mainContent = document.querySelector('.main-content');
          if (mainContent) {
            mainContent.style.marginLeft = nextCollapse ? '80px' : '260px';
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: '0.5rem 1rem',
          color: 'var(--text-secondary)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--border-radius-sm)',
          cursor: 'pointer',
          marginBottom: '0.5rem',
          transition: 'var(--transition-smooth)'
        }}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {!isCollapsed && <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Collapse Menu</span>}
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Theme controls */}
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        style={themeToggleStyle}
      >
        <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        {!isCollapsed && <span style={{ fontSize: '0.85rem' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>

      {/* Logout button */}
      <button onClick={() => { onClose(); logout(); }} style={logoutButtonStyle}>
        <LogOut size={20} />
        {!isCollapsed && <span>{t('logout')}</span>}
      </button>
    </div>
  );
};

export default Sidebar;
