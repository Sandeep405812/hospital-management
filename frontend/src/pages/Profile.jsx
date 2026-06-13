import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const Profile = () => {
  const { user, loadUser } = useAuth();
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
    </div>
  );
};

export default Profile;
