import React from 'react';
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
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

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
    marginTop: 'auto',
    fontWeight: '600',
    transition: 'var(--transition-smooth)',
  };

  return (
    <div style={sidebarStyle} className="sidebar">
      <div style={logoStyle}>
        <span>🏥 CareHMS</span>
      </div>

      <nav style={navLinksStyle}>
        {filteredLinks.map((link) => (
          <NavLink key={link.to} to={link.to} style={linkStyle}>
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <button onClick={logout} style={logoutButtonStyle}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
