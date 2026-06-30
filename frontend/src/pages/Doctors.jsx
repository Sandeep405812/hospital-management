import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Plus, Trash2, Mail, Phone, Clock, Award } from 'lucide-react';

const Doctors = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Doctor Creation Modal State (Admin only)
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

  // Doctor Shift Roster Modal State (Admin only)
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedDoctorForRoster, setSelectedDoctorForRoster] = useState(null);
  const [rosterForm, setRosterForm] = useState({
    shift: 'Morning (09:00 - 14:00)'
  });

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
        if (user.role === 'admin') {
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
    setRosterForm({
      shift: doctor.schedule?.join(', ') || 'Morning (09:00 - 14:00)'
    });
    setIsRosterModalOpen(true);
  };

  const handleSaveRoster = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/doctors/${selectedDoctorForRoster._id}`, {
        schedule: [rosterForm.shift]
      });
      setIsRosterModalOpen(false);
      fetchDoctors();
      alert('Doctor shift roster updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update roster');
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
        {user.role === 'admin' && (
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
          <Table headers={['Doctor Details', 'Department', 'Specialization', 'Consultation Fee', 'Schedule', 'Actions']}>
            {doctors.map((doc) => (
              <tr key={doc._id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{doc.user?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} />{doc.user?.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} />{doc.user?.phoneNumber || 'N/A'}</span>
                  </div>
                </td>
                <td>{doc.department?.name || 'N/A'}</td>
                <td>{doc.specialization}</td>
                <td style={{ fontWeight: 600 }}>₹{doc.consultationFee}</td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {doc.schedule?.join(', ') || '09:00 - 17:00'}
                  </div>
                </td>
                <td>
                  {user.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem' }}
                        onClick={() => handleOpenRoster(doc)}
                        title="Shift Roster"
                      >
                        <Clock size={16} />
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

      {/* Manage Shift Roster Modal (Admin-only) */}
      <Modal isOpen={isRosterModalOpen} onClose={() => setIsRosterModalOpen(false)} title="Manage Doctor Shift Roster">
        {selectedDoctorForRoster && (
          <form onSubmit={handleSaveRoster}>
            <div style={{ marginBottom: '1.25rem', fontSize: '0.92rem' }}>
              Assign shift timetable duty roster for <strong>{selectedDoctorForRoster.user?.name}</strong>.
            </div>

            <div className="form-group">
              <label className="form-label">Duty Shift Timings *</label>
              <select
                className="form-select"
                value={rosterForm.shift}
                onChange={(e) => setRosterForm({ ...rosterForm, shift: e.target.value })}
                required
              >
                <option value="Morning (09:00 - 14:00)">Morning Duty (09:00 AM - 02:00 PM)</option>
                <option value="Evening (14:00 - 19:00)">Evening Duty (02:00 PM - 07:00 PM)</option>
                <option value="Night Duty (19:00 - 08:00)">Night Duty (07:00 PM - 08:00 AM)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '1.5rem' }}>
              Confirm Roster Allocation
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Doctors;
