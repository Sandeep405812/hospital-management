import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Stethoscope,
  Bed,
  Headphones,
  Briefcase,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_STAFF_SCHEDULE = {
  Monday: '09:00 - 17:00',
  Tuesday: '09:00 - 17:00',
  Wednesday: '09:00 - 17:00',
  Thursday: '09:00 - 17:00',
  Friday: '09:00 - 17:00',
  Saturday: '09:00 - 13:00',
  Sunday: 'Off',
};

const StaffManagement = () => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin_doctors',
    department: 'Cardiology',
    phoneNumber: '',
    gender: 'Male',
  });

  // Day-Wise Duty Schedule State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] = useState(null);
  const [staffDaySchedule, setStaffDaySchedule] = useState(DEFAULT_STAFF_SCHEDULE);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.get('/staff');
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/staff', formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin_doctors',
        department: 'General',
        phoneNumber: '',
        gender: 'Male',
      });
      await fetchStaff();
      alert('Staff member / Administrator created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (staffId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.put(`/staff/${staffId}`, { status: nextStatus });
      await fetchStaff();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from staff registry?`)) return;
    try {
      await api.delete(`/staff/${staffId}`);
      await fetchStaff();
      alert('Staff member removed successfully');
    } catch (err) {
      alert(err.message || 'Failed to delete staff member');
    }
  };

  const handleOpenStaffSchedule = (staff) => {
    setSelectedStaffForSchedule(staff);
    let sched = { ...DEFAULT_STAFF_SCHEDULE };
    if (staff.schedule) {
      if (typeof staff.schedule === 'object') {
        DAYS_OF_WEEK.forEach((d) => {
          if (staff.schedule[d]) sched[d] = staff.schedule[d];
        });
      }
    }
    setStaffDaySchedule(sched);
    setShowScheduleModal(true);
  };

  const handleSaveStaffSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/staff/${selectedStaffForSchedule._id}`, {
        schedule: staffDaySchedule,
      });
      setShowScheduleModal(false);
      await fetchStaff();
      alert('Staff day-wise duty shift schedule updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update duty schedule');
    }
  };

  const applyStaffTemplate = (shiftType) => {
    if (shiftType === 'general') {
      setStaffDaySchedule({
        Monday: '09:00 - 17:00',
        Tuesday: '09:00 - 17:00',
        Wednesday: '09:00 - 17:00',
        Thursday: '09:00 - 17:00',
        Friday: '09:00 - 17:00',
        Saturday: '09:00 - 13:00',
        Sunday: 'Off',
      });
    } else if (shiftType === 'morning') {
      setStaffDaySchedule({
        Monday: '08:00 - 16:00',
        Tuesday: '08:00 - 16:00',
        Wednesday: '08:00 - 16:00',
        Thursday: '08:00 - 16:00',
        Friday: '08:00 - 16:00',
        Saturday: '08:00 - 14:00',
        Sunday: 'Off',
      });
    } else if (shiftType === 'night') {
      setStaffDaySchedule({
        Monday: '20:00 - 08:00',
        Tuesday: '20:00 - 08:00',
        Wednesday: '20:00 - 08:00',
        Thursday: '20:00 - 08:00',
        Friday: '20:00 - 08:00',
        Saturday: 'Off',
        Sunday: 'Off',
      });
    }
  };

  // Role metadata helper
  const getRoleDetails = (role) => {
    switch (role) {
      case 'admin_doctors':
        return { label: 'Doctor Manager', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', icon: Stethoscope };
      case 'admin_helpdesk':
        return { label: 'Helpdesk Manager', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Headphones };
      case 'admin_staff':
        return { label: 'Staff & HR Manager', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: Briefcase };
      case 'admin':
        return { label: 'Hospital Admin', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: ShieldCheck };
      case 'receptionist':
        return { label: 'Front Desk / Reception', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', icon: Users };
      case 'doctor':
        return { label: 'Medical Doctor', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', icon: Stethoscope };
      default:
        return { label: role, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', icon: Users };
    }
  };

  // Filtered list
  const filteredStaff = staffList.filter((s) => {
    const matchesFilter = filterRole === 'All' ? true : s.role === filterRole;
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Role Counts
  const countAdmin = staffList.filter((s) => s.role === 'admin').length;
  const countDocAdmin = staffList.filter((s) => s.role === 'admin_doctors').length;
  const countHelpdesk = staffList.filter((s) => s.role === 'admin_helpdesk').length;
  const countStaffAdmin = staffList.filter((s) => s.role === 'admin_staff').length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Hospital Staff & Administrator Command Center</h1>
          <p className="page-subtitle">Hospital Admin control center to manage specialized Domain Admins, Doctors, and Staff</p>
        </div>
        {user?.role === 'admin' && (
          <button
            className="btn btn-teal"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserPlus size={18} />
            <span>Create Staff / Domain Admin</span>
          </button>
        )}
      </div>

      {/* Domain Role Metric Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-info">
            <p>Hospital Admins</p>
            <h3 style={{ color: '#3b82f6' }}>{countAdmin}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0ea5e9' }}>
          <div className="stat-info">
            <p>Doctor Managers</p>
            <h3 style={{ color: '#0ea5e9' }}>{countDocAdmin}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>
            <Stethoscope size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-info">
            <p>Helpdesk Managers</p>
            <h3 style={{ color: '#f59e0b' }}>{countHelpdesk}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Headphones size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-info">
            <p>Staff & HR Admins</p>
            <h3 style={{ color: '#8b5cf6' }}>{countStaffAdmin}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Briefcase size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'All Personnel', val: 'All' },
            { label: 'Admins', val: 'admin' },
            { label: 'Doctor Managers', val: 'admin_doctors' },
            { label: 'Helpdesk Admins', val: 'admin_helpdesk' },
            { label: 'Staff Admins', val: 'admin_staff' },
            { label: 'Receptionists', val: 'receptionist' },
          ].map((tab) => (
            <button
              key={tab.val}
              className={`btn ${filterRole === tab.val ? 'btn-teal' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilterRole(tab.val)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search name, email, department..."
            style={{ paddingLeft: '2.4rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Staff Personnel Directory Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Personnel Details</th>
              <th>Domain Role & Authority</th>
              <th>Assigned Department</th>
              <th>Contact Info</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading Staff Directory...</td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No personnel found matching selected criteria.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => {
                const meta = getRoleDetails(staff.role);
                const IconComponent = meta.icon;
                const isSelf = staff._id === user?._id;

                return (
                  <tr key={staff._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: meta.bg, color: meta.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.95rem'
                        }}>
                          {staff.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{staff.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{staff.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.35rem 0.75rem', borderRadius: '9999px',
                        backgroundColor: meta.bg, color: meta.color,
                        fontSize: '0.78rem', fontWeight: 700, border: `1px solid ${meta.color}40`
                      }}>
                        <IconComponent size={14} />
                        <span>{meta.label}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <Building2 size={14} style={{ color: 'var(--accent-teal)' }} />
                          <span style={{ fontWeight: 600 }}>{staff.department || 'General'}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {staff.schedule?.Monday ? `Mon: ${staff.schedule.Monday}` : 'Shift: 09:00 - 17:00'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div>{staff.phoneNumber || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem' }}>Gender: {staff.gender || 'N/A'}</div>
                      </div>
                    </td>

                    <td>
                      <button
                        onClick={() => !isSuper && handleStatusToggle(staff._id, staff.status || 'Active')}
                        disabled={isSuper}
                        style={{
                          background: 'none', border: 'none', cursor: isSuper ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.8rem', fontWeight: 600,
                          color: staff.status === 'Active' || !staff.status ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {staff.status === 'Active' || !staff.status ? (
                          <>
                            <CheckCircle size={14} />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            <span>Suspended</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td>
                      {!isSelf && (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Assign Day-Wise Duty Timings"
                            onClick={() => handleOpenStaffSchedule(staff)}
                          >
                            <span>📅 Schedule</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.55rem', color: '#ef4444' }}
                            title="Remove Personnel"
                            onClick={() => handleDeleteStaff(staff._id, staff.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Staff & Specialized Sub-Admin Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '540px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Create Staff / Domain Administrator
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Assign dedicated authority to manage doctors, beds, helpdesk, or staff operations.
            </p>

            <form onSubmit={handleCreateStaff}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Rajesh Kumar, Priya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="official@hospital.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Select Domain Role *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="admin_doctors">🩺 Doctor & Department Manager</option>
                    <option value="admin_helpdesk">🎧 Helpdesk & Reception Head</option>
                    <option value="admin_staff">💼 Staff & HR Operations Manager</option>
                    <option value="receptionist">👥 Front Desk Receptionist</option>
                    <option value="doctor">👨‍⚕️ Medical Doctor</option>
                    <option value="admin">🛡️ Hospital Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Department</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Cardiology, IPD Wards, Help Desk"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-teal btn-full" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Personnel'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day-Wise Duty Shift & Timing Schedule Modal */}
      {showScheduleModal && selectedStaffForSchedule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '560px', width: '92%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.4rem', color: '#fff' }}>
              📅 Manage Day-Wise Duty Shift Schedule
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
              Assign shift timings and weekly off days for <strong style={{ color: '#fff' }}>{selectedStaffForSchedule.name}</strong> ({selectedStaffForSchedule.department || 'Hospital Operations'}).
            </p>

            {/* Quick Templates */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Shifts:</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyStaffTemplate('general')}
              >
                General (09:00 - 17:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyStaffTemplate('morning')}
              >
                Morning (08:00 - 16:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyStaffTemplate('night')}
              >
                Night (20:00 - 08:00)
              </button>
            </div>

            {/* 7 Days Schedule Grid */}
            <form onSubmit={handleSaveStaffSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                {DAYS_OF_WEEK.map((day) => {
                  const currentVal = staffDaySchedule[day] || 'Off';
                  const isOff = currentVal === 'Off';

                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ width: '100px', fontWeight: 700, fontSize: '0.85rem', color: isOff ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {day}
                      </div>

                      <div style={{ flex: 1 }}>
                        <select
                          className="form-select"
                          style={{ margin: 0, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                          value={currentVal}
                          onChange={(e) => setStaffDaySchedule({ ...staffDaySchedule, [day]: e.target.value })}
                        >
                          <option value="09:00 - 17:00">General Shift (09:00 - 17:00)</option>
                          <option value="08:00 - 16:00">Morning Shift (08:00 - 16:00)</option>
                          <option value="14:00 - 22:00">Evening Shift (14:00 - 22:00)</option>
                          <option value="20:00 - 08:00">Night Duty (20:00 - 08:00)</option>
                          <option value="10:00 - 19:00">Full Operational (10:00 - 19:00)</option>
                          <option value="Off">Weekly Off</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStaffDaySchedule({ ...staffDaySchedule, [day]: isOff ? '09:00 - 17:00' : 'Off' })}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isOff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                          color: isOff ? 'var(--danger)' : 'var(--accent-teal)',
                        }}
                      >
                        {isOff ? 'Off Day' : 'On Duty'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-teal btn-full">
                  Save Day-Wise Shift Schedule
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
