import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!user) return null;

  const links = [
    {
      to: '/dashboard',
      label: t('dashboard'),
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
    },
    {
      to: '/appointments',
      label: t('appointments'),
      icon: <Calendar size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
    },
    {
      to: '/symptom-checker',
      label: t('symptomChecker'),
      icon: <Heart size={20} />,
      roles: ['patient'],
    },
    {
      to: '/metrics',
      label: t('healthTracker'),
      icon: <Activity size={20} />,
      roles: ['patient'],
    },
    {
      to: '/doctors',
      label: t('doctors'),
      icon: <Stethoscope size={20} />,
      roles: ['admin', 'patient', 'receptionist'],
    },
    {
      to: '/patients',
      label: t('patients'),
      icon: <Users size={20} />,
      roles: ['admin', 'doctor', 'receptionist'],
    },
    {
      to: '/beds',
      label: t('beds'),
      icon: <Layers size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
    },
    {
      to: '/surgery-schedule',
      label: t('surgeries'),
      icon: <Calendar size={20} />,
      roles: ['admin', 'doctor', 'receptionist'],
    },
    {
      to: '/prescriptions',
      label: t('prescriptions'),
      icon: <FileText size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
    {
      to: '/billing',
      label: t('billingInvoices'),
      icon: <CreditCard size={20} />,
      roles: ['admin', 'patient', 'receptionist'],
    },
    {
      to: '/reports',
      label: t('medicalReports'),
      icon: <FolderOpen size={20} />,
      roles: ['patient'],
    },
    {
      to: '/departments',
      label: t('departments'),
      icon: <Layers size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
    },
    {
      to: '/profile',
      label: t('myProfile'),
      icon: <User size={20} />,
      roles: ['admin', 'doctor', 'patient', 'receptionist'],
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(user.role));

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
    zIndex: 100,
    transition: 'var(--transition-smooth)',
  };

  const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '2rem',
    background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-teal) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const navLinksStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: '1rem',
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
    fontWeight: isActive ? '600' : '400',
    transition: 'var(--transition-smooth)',
  });

  const themeToggleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--glass-border)',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    fontWeight: '600',
    transition: 'var(--transition-smooth)',
    justifyContent: 'center',
  };

  const logoutButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--danger)',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'var(--transition-smooth)',
  };

  return (
    <div style={sidebarStyle} className={`sidebar ${isOpen ? 'open' : ''}`}>
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

      <div style={logoStyle}>
        <span>🏥 AS HOSPITAL</span>
      </div>

      <nav style={navLinksStyle}>
        {filteredLinks.map((link) => (
          <NavLink key={link.to} to={link.to} style={linkStyle} onClick={onClose}>
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        style={themeToggleStyle}
      >
        <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
      </button>

      <button onClick={() => { onClose(); logout(); }} style={logoutButtonStyle}>
        <LogOut size={20} />
        <span>{t('logout')}</span>
      </button>
    </div>
  );
};

export default Sidebar;
