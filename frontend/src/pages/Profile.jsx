import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import { Calendar, FileText, CreditCard, FolderOpen, User as UserIcon, Activity } from 'lucide-react';

const Profile = () => {
  const { user, loadUser } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifscCode: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, timeline
  const [timeline, setTimeline] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);

  useEffect(() => {
    if (user && user.role === 'patient') {
      const fetchTimeline = async () => {
        try {
          const [apps, scripts, bills, reps, summaries] = await Promise.all([
            api.get('/appointments'),
            api.get('/prescriptions'),
            api.get('/billing'),
            api.get('/reports'),
            api.get('/beds/discharge-summaries')
          ]);

          const items = [
            ...apps.map(a => ({ date: a.date, type: 'appointment', title: 'Doctor Consultation', desc: `Consulted Dr. ${a.doctor?.user?.name || 'Physician'} (${a.symptoms})`, badge: a.status })),
            ...scripts.map(p => ({ date: p.date, type: 'prescription', title: 'Rx Prescription Issued', desc: `Medicines: ${p.medicines?.map(m => m.name).join(', ')}`, notes: p.notes })),
            ...bills.map(b => ({ date: b.createdAt, type: 'billing', title: 'Billing Statement', desc: `Invoice Total: ₹${b.total}`, badge: b.status })),
            ...reps.map(r => ({ date: r.date, type: 'report', title: 'Lab Report Uploaded', desc: r.title })),
            ...summaries.map(s => ({ date: s.dischargeDate, type: 'discharge', title: 'Discharge Summary', desc: `Discharged from Bed ${s.bedNumber} (${s.wardType} Ward). Diagnosis: ${s.diagnosis}`, details: s }))
          ];

          items.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTimeline(items);
        } catch (err) {
          console.error('Failed to compile timeline logs', err);
        }
      };
      fetchTimeline();
    }
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get('/settings');
        setPaymentSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    if (user && user.role === 'admin') {
      fetchSettings();
    }
  }, [user]);

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      await api.put('/settings', paymentSettings);
      alert('Hospital payment settings updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Upload failed');
      }

      await loadUser();
      alert('Profile picture updated successfully!');
    } catch (err) {
      alert(err.message || 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    gender: 'Male',
    // Patient details
    dateOfBirth: '',
    bloodType: 'A+',
    allergies: '',
    medicalHistory: '',
    emergencyContact: '',
    // Doctor details
    specialization: '',
    consultationFee: 500,
    experience: '',
    qualification: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const detailed = user.detailedProfile || {};
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        gender: user.gender || 'Male',
        dateOfBirth: detailed.dateOfBirth ? new Date(detailed.dateOfBirth).toISOString().split('T')[0] : '',
        bloodType: detailed.bloodType || 'A+',
        allergies: detailed.allergies?.join(', ') || '',
        medicalHistory: detailed.medicalHistory?.join(', ') || '',
        emergencyContact: detailed.emergencyContact || '',
        specialization: detailed.specialization || '',
        consultationFee: detailed.consultationFee || 500,
        experience: detailed.experience || '',
        qualification: detailed.qualification || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user.role === 'patient') {
        const payload = {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          bloodType: formData.bloodType,
          allergies: formData.allergies.split(',').map((x) => x.trim()).filter(Boolean),
          medicalHistory: formData.medicalHistory.split(',').map((x) => x.trim()).filter(Boolean),
          emergencyContact: formData.emergencyContact,
        };
        await api.put(`/patients/${user.relativeId}`, payload);
      } else if (user.role === 'doctor') {
        const payload = {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender,
          specialization: formData.specialization,
          consultationFee: formData.consultationFee,
          experience: formData.experience,
          qualification: formData.qualification,
        };
        await api.put(`/doctors/${user.relativeId}`, payload);
      } else {
        // Admin profile update
        // We can create a simple user put route if needed, or update patient/doctor details.
        // For admin, let's keep it simple or use standard user profile edit.
        alert('Admin profile edits not configured.');
        setLoading(false);
        return;
      }

      await loadUser();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account information and settings</p>
        </div>
      </div>

      {/* Patient Timeline / Profile Tab Switcher */}
      {user.role === 'patient' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', maxWidth: '800px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-teal' : 'btn-secondary'} btn-sm`}
          >
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`btn ${activeTab === 'timeline' ? 'btn-teal' : 'btn-secondary'} btn-sm`}
          >
            Medical Timeline
          </button>
        </div>
      )}

      <div className="dashboard-section" style={{ maxWidth: '800px' }}>
        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>Account Specifications</h3>
            {user.role !== 'admin' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            )}
          </div>

          {/* Avatar Upload Layout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              border: '2px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              color: 'var(--accent-blue)',
            }}>
              {user.avatar ? (
                <img
                  src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2rem' }}>👤</span>
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Profile Picture</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => document.getElementById('avatar-input').click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
              </button>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address (Cannot change)</label>
              <input type="email" className="form-input" value={user.email} disabled />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Patient Specific Fields */}
          {user.role === 'patient' && (
            <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)', marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Health Information
              </h3>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Type</label>
                  <select
                    className="form-select"
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    disabled={!isEditing}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allergies (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medical History (comma-separated)</label>
                <textarea
                  className="form-textarea"
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </>
          )}

          {/* Doctor Specific Fields */}
          {user.role === 'doctor' && (
            <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)', marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Professional Specifications
              </h3>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultation Fee (INR)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Qualifications</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {isEditing && (
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
        ) : (
          /* Timeline view content */
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              My Medical Journey Timeline
            </h3>
            {timeline.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No history logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px dashed var(--glass-border)', marginLeft: '1rem' }}>
                {timeline.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      marginBottom: '0.5rem',
                      cursor: item.type === 'discharge' ? 'pointer' : 'default',
                      padding: item.type === 'discharge' ? '0.75rem' : '0',
                      borderRadius: item.type === 'discharge' ? 'var(--border-radius-sm)' : '0',
                      background: item.type === 'discharge' ? 'rgba(236, 72, 153, 0.05)' : 'none',
                      border: item.type === 'discharge' ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none',
                      transition: 'var(--transition-smooth)',
                    }}
                    onClick={() => {
                      if (item.type === 'discharge') {
                        setSelectedSummary(item.details);
                      }
                    }}
                  >
                    {/* Timeline bullet dot */}
                    <div style={{
                      position: 'absolute',
                      left: item.type === 'discharge' ? '-43px' : '-31px',
                      top: item.type === 'discharge' ? '16px' : '4px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      backgroundColor: item.type === 'appointment' ? 'var(--accent-blue)' : item.type === 'prescription' ? 'var(--accent-teal)' : item.type === 'billing' ? 'var(--warning)' : item.type === 'discharge' ? '#ec4899' : 'var(--success)',
                      border: '3px solid #0f172a'
                    }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.15rem 0', color: '#fff' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{item.desc}</p>
                    {item.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0 0' }}>Advice: {item.notes}</p>}
                    {item.badge && <span className={`badge badge-${item.badge}`} style={{ marginTop: '0.4rem' }}>{item.badge}</span>}
                    {item.type === 'discharge' && (
                      <span style={{ fontSize: '0.75rem', color: '#ec4899', display: 'block', marginTop: '0.4rem', fontWeight: 600 }}>
                        Click to view full Clinical Report
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {user.role === 'admin' && (
        <div style={{ marginTop: '2rem', background: 'var(--glass-bg)', padding: '2rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏥 Hospital Payment Configurations</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Set the merchant UPI ID and bank account details here. These values will automatically populate the patients checkout gateway.
          </p>

          <form onSubmit={handleSettingsSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Merchant UPI ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentSettings.upiId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Beneficiary Account Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentSettings.accountName}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, accountName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Bank Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentSettings.bankName}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, bankName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentSettings.accountNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, accountNumber: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentSettings.ifscCode}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, ifscCode: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '1rem' }} disabled={settingsLoading}>
              {settingsLoading ? 'Saving Settings...' : 'Update Payment Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Discharge Summary details modal popup */}
      {selectedSummary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Clinical Discharge Summary
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              Official discharge records for your hospital admission.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <div>
                <strong>Ward Details:</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Bed {selectedSummary.bedNumber} ({selectedSummary.wardType} Ward)
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>Admission Date:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {new Date(selectedSummary.admissionDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <strong>Discharge Date:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {new Date(selectedSummary.dischargeDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <strong>Clinical Diagnosis:</strong>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  {selectedSummary.diagnosis}
                </div>
              </div>

              <div>
                <strong>Treatment Summary:</strong>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {selectedSummary.treatment}
                </div>
              </div>

              <div>
                <strong>Condition at Discharge:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="badge badge-completed">{selectedSummary.condition}</span>
                </div>
              </div>

              {selectedSummary.followUp && (
                <div>
                  <strong>Follow-up Plan & Advice:</strong>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                    {selectedSummary.followUp}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => setSelectedSummary(null)}
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
