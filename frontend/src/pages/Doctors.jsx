import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Plus, Trash2, Mail, Phone, Clock, Award } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DOCTOR_SCHEDULE = {
  Monday: '09:00 - 17:00',
  Tuesday: '09:00 - 17:00',
  Wednesday: '09:00 - 17:00',
  Thursday: '09:00 - 17:00',
  Friday: '09:00 - 17:00',
  Saturday: '09:00 - 13:00',
  Sunday: 'Off',
};

const Doctors = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'admin_doctors';
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Doctor Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: 'Male',
    specialization: '',
    department: '',
    consultationFee: 500,
    experience: '',
    qualification: '',
  });

  // Doctor Day-Wise Schedule Modal State
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedDoctorForRoster, setSelectedDoctorForRoster] = useState(null);
  const [daySchedule, setDaySchedule] = useState(DEFAULT_DOCTOR_SCHEDULE);

  const fetchDoctors = async () => {
    try {
      const data = await api.get('/doctors');
      setDoctors(data);
    } catch (error) {
      console.error('Failed to load doctors list', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchDoctors();
        if (canManage) {
          const depts = await api.get('/departments');
          setDepartments(depts);
        }
      } catch (error) {
        console.error('Error loading doctors page data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/doctors', doctorForm);
      setIsAddModalOpen(false);
      setDoctorForm({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        gender: 'Male',
        specialization: '',
        department: '',
        consultationFee: 500,
        experience: '',
        qualification: '',
      });
      fetchDoctors();
      alert('Doctor account and details created successfully!');
    } catch (error) {
      alert(error.message || 'Failed to create doctor');
    }
  };

  const handleOpenRoster = (doctor) => {
    setSelectedDoctorForRoster(doctor);
    
    // Parse existing availability or schedule
    let initialSchedule = { ...DEFAULT_DOCTOR_SCHEDULE };
    if (doctor.availability) {
      DAYS_OF_WEEK.forEach((d) => {
        if (doctor.availability[d]) {
          const val = doctor.availability[d];
          initialSchedule[d] = Array.isArray(val) ? (val.length ? `${val[0]} - ${val[val.length - 1]}` : 'Off') : val;
        }
      });
    } else if (doctor.schedule && doctor.schedule.length) {
      // Map general schedule
      const general = doctor.schedule[0];
      DAYS_OF_WEEK.forEach((d) => {
        if (d !== 'Sunday') initialSchedule[d] = general;
      });
    }

    setDaySchedule(initialSchedule);
    setIsRosterModalOpen(true);
  };

  const handleSaveRoster = async (e) => {
    e.preventDefault();
    try {
      const formattedSchedule = Object.entries(daySchedule).map(([d, t]) => `${d}: ${t}`);
      await api.put(`/doctors/${selectedDoctorForRoster._id}`, {
        schedule: formattedSchedule,
        availability: daySchedule,
      });
      setIsRosterModalOpen(false);
      fetchDoctors();
      alert('Doctor day-wise timetable updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update roster');
    }
  };

  const applyPresetTemplate = (type) => {
    if (type === 'general') {
      setDaySchedule({
        Monday: '09:00 - 17:00',
        Tuesday: '09:00 - 17:00',
        Wednesday: '09:00 - 17:00',
        Thursday: '09:00 - 17:00',
        Friday: '09:00 - 17:00',
        Saturday: '09:00 - 13:00',
        Sunday: 'Off',
      });
    } else if (type === 'morning') {
      setDaySchedule({
        Monday: '08:00 - 14:00',
        Tuesday: '08:00 - 14:00',
        Wednesday: '08:00 - 14:00',
        Thursday: '08:00 - 14:00',
        Friday: '08:00 - 14:00',
        Saturday: '08:00 - 12:00',
        Sunday: 'Off',
      });
    } else if (type === 'evening') {
      setDaySchedule({
        Monday: '14:00 - 20:00',
        Tuesday: '14:00 - 20:00',
        Wednesday: '14:00 - 20:00',
        Thursday: '14:00 - 20:00',
        Friday: '14:00 - 20:00',
        Saturday: '14:00 - 18:00',
        Sunday: 'Off',
      });
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading doctors registry...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">View and manage clinical medical staff</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} />
            <span>Add Doctor</span>
          </button>
        )}
      </div>

      <div className="dashboard-section">
        {doctors.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No doctors registered yet.</p>
        ) : (
          <Table headers={['Doctor Details', 'Department', 'Specialization', 'Consultation Fee', 'Weekly Timings', 'Actions']}>
            {doctors.map((doc) => (
              <tr key={doc._id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{doc.user?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} />{doc.user?.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} />{doc.user?.phoneNumber || 'N/A'}</span>
                  </div>
                </td>
                <td>{doc.department?.name || 'General'}</td>
                <td>{doc.specialization}</td>
                <td style={{ fontWeight: 600 }}>₹{doc.consultationFee}</td>
                <td>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                      <Clock size={12} /> Day-Wise Schedule
                    </div>
                    {doc.schedule && doc.schedule.length > 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {doc.schedule.slice(0, 2).join(' • ')} {doc.schedule.length > 2 ? `+${doc.schedule.length - 2} more` : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mon-Sat (09:00 - 17:00)</span>
                    )}
                  </div>
                </td>
                <td>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => handleOpenRoster(doc)}
                        title="Edit Day-Wise Schedule"
                      >
                        <Clock size={14} />
                        <span>Schedule</span>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem' }}
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this doctor? This will also delete their login account.')) {
                            api.delete(`/doctors/${doc._id}`).then(() => {
                              fetchDoctors();
                              alert('Doctor removed');
                            });
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Add Doctor Modal (Admin-only) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Doctor">
        <form onSubmit={handleAddDoctor}>
          <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Account Details</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Dr. Sarah Connor"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="sarah@hospital.com"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={doctorForm.password}
                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                className="form-input"
                placeholder="9876543210"
                value={doctorForm.phoneNumber}
                onChange={(e) => setDoctorForm({ ...doctorForm, phoneNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gender</label>
            <select
              className="form-select"
              value={doctorForm.gender}
              onChange={(e) => setDoctorForm({ ...doctorForm, gender: e.target.value })}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)', marginBottom: '1rem', marginTop: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Professional Info</h3>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Specialization *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Cardiologist"
                value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-select"
                value={doctorForm.department}
                onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                required
              >
                <option value="">-- Choose Department --</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Qualifications *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MD, MBBS"
                value={doctorForm.qualification}
                onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (Years) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 8"
                value={doctorForm.experience}
                onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Consultation Fee (INR) *</label>
            <input
              type="number"
              className="form-input"
              value={doctorForm.consultationFee}
              onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Register Doctor Account
          </button>
        </form>
      </Modal>

      {/* Manage Day-Wise Timing & Schedule Modal */}
      <Modal isOpen={isRosterModalOpen} onClose={() => setIsRosterModalOpen(false)} title="Manage Doctor Day-Wise Timing & OPD Schedule">
        {selectedDoctorForRoster && (
          <form onSubmit={handleSaveRoster}>
            <div style={{ marginBottom: '1.25rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Configure daily duty timings & consultation availability for <strong style={{ color: '#fff' }}>{selectedDoctorForRoster.user?.name}</strong>.
            </div>

            {/* Quick Templates */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Templates:</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyPresetTemplate('general')}
              >
                Standard (09:00 - 17:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyPresetTemplate('morning')}
              >
                Morning (08:00 - 14:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => applyPresetTemplate('evening')}
              >
                Evening (14:00 - 20:00)
              </button>
            </div>

            {/* 7 Days Schedule Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.3rem' }}>
              {DAYS_OF_WEEK.map((day) => {
                const currentVal = daySchedule[day] || 'Off';
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
                        onChange={(e) => setDaySchedule({ ...daySchedule, [day]: e.target.value })}
                      >
                        <option value="09:00 - 17:00">Full Day OPD (09:00 - 17:00)</option>
                        <option value="09:00 - 13:00">Morning OPD (09:00 - 13:00)</option>
                        <option value="14:00 - 18:00">Evening OPD (14:00 - 18:00)</option>
                        <option value="10:00 - 14:00">Specialist OPD (10:00 - 14:00)</option>
                        <option value="18:00 - 22:00">Night Consult (18:00 - 22:00)</option>
                        <option value="Off">Weekly Off / Closed</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDaySchedule({ ...daySchedule, [day]: isOff ? '09:00 - 17:00' : 'Off' })}
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
                      {isOff ? 'Off Day' : 'Working'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '1.5rem' }}>
              Save Day-Wise Doctor Schedule
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Doctors;
