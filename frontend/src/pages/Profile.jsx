import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';

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

      <div className="dashboard-section" style={{ maxWidth: '800px' }}>
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
    </div>
  );
};

export default Profile;
