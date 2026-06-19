import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!user) return null;

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
    {
      to: '/appointments',
      label: 'Appointments',
      icon: <Calendar size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
    {
      to: '/symptom-checker',
      label: 'Symptom Checker',
      icon: <Heart size={20} />,
      roles: ['patient'],
    },
    {
      to: '/metrics',
      label: 'Health Tracker',
      icon: <Activity size={20} />,
      roles: ['patient'],
    },
    {
      to: '/doctors',
      label: 'Doctors',
      icon: <Stethoscope size={20} />,
      roles: ['admin', 'patient'],
    },
    {
      to: '/patients',
      label: 'Patients',
      icon: <Users size={20} />,
      roles: ['admin', 'doctor'],
    },
    {
      to: '/prescriptions',
      label: 'Prescriptions',
      icon: <FileText size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
    {
      to: '/billing',
      label: 'Billing / Invoices',
      icon: <CreditCard size={20} />,
      roles: ['admin', 'patient'],
    },
    {
      to: '/reports',
      label: 'Medical Reports',
      icon: <FolderOpen size={20} />,
      roles: ['patient'],
    },
    {
      to: '/departments',
      label: 'Departments',
      icon: <Layers size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
    {
      to: '/profile',
      label: 'My Profile',
      icon: <User size={20} />,
      roles: ['admin', 'doctor', 'patient'],
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(user.role));

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
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
    <div style={sidebarStyle} className="sidebar">
      <div style={logoStyle}>
        <span>🏥 AS HOSPITAL</span>
      </div>

      <nav style={navLinksStyle}>
        {filteredLinks.map((link) => (
          <NavLink key={link.to} to={link.to} style={linkStyle}>
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

      <button onClick={logout} style={logoutButtonStyle}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
