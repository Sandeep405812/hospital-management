import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodType: 'A+',
    emergencyContact: '',
  });

  useEffect(() => {
    gsap.fromTo('.auth-card',
      { y: 40, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }
    );
    gsap.fromTo('.form-group, .btn, h3',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.05, delay: 0.15 }
    );
  }, []);
  const [formError, setFormError] = useState('');

  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Check basic details
    if (!formData.name || !formData.email || !formData.password || !formData.dateOfBirth || !formData.emergencyContact) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <span>🏥 AS HOSPITAL</span>
          </div>
          <p className="auth-subtitle">Create a patient account to book appointments</p>
        </div>

        {(formError || error) && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius)',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            {formError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Personal Info</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                className="form-input"
                placeholder="9876543210"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                name="dateOfBirth"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)', marginBottom: '1rem', marginTop: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>Medical & Contact Details</h3>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Blood Type *</label>
              <select name="bloodType" className="form-select" value={formData.bloodType} onChange={handleChange}>
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
            <div className="form-group">
              <label className="form-label">Emergency Contact *</label>
              <input
                type="text"
                name="emergencyContact"
                className="form-input"
                placeholder="Name - 9988776655"
                value={formData.emergencyContact}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
