import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [activeRole, setActiveRole] = useState('patient');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  useEffect(() => {
    gsap.fromTo('.auth-card',
      { y: 40, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }
    );
    gsap.fromTo('.form-group, .btn',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08, delay: 0.15 }
    );
  }, []);

  const ROLE_ACCOUNTS = {
    patient: { email: 'patient@hospital.com', pass: 'patientpassword123', label: 'Patient' },
    doctor: { email: 'doctor@hospital.com', pass: 'doctorpassword123', label: 'Doctor' },
    superadmin: { email: 'superadmin@hospital.com', pass: 'superadmin123', label: '👑 Super Admin' },
    admin_beds: { email: 'bedadmin@hospital.com', pass: 'bedadmin123', label: '🛏️ Bed Admin' },
    admin_doctors: { email: 'doctoradmin@hospital.com', pass: 'doctoradmin123', label: '🩺 Doc Admin' },
    admin: { email: 'admin@hospital.com', pass: 'adminpassword123', label: 'Admin' },
  };

  useEffect(() => {
    if (ROLE_ACCOUNTS[activeRole]) {
      setEmail(ROLE_ACCOUNTS[activeRole].email);
      setPassword(ROLE_ACCOUNTS[activeRole].pass);
    }
  }, [activeRole]);

  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error handled by context/login
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span>🏥 AS HOSPITAL</span>
          </div>
          <p className="auth-subtitle">Login to access your medical dashboard</p>
        </div>

        {/* Role tabs switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: 'var(--bg-primary)', padding: '0.3rem', borderRadius: 'var(--border-radius-sm)' }}>
          {Object.entries(ROLE_ACCOUNTS).map(([rKey, rVal]) => (
            <button
              key={rKey}
              type="button"
              onClick={() => setActiveRole(rKey)}
              style={{
                padding: '0.45rem 0.4rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeRole === rKey ? 'var(--accent-teal)' : 'transparent',
                color: activeRole === rKey ? '#fff' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {rVal.label}
            </button>
          ))}
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
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <span 
                onClick={() => setShowForgotModal(true)} 
                style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
              >
                Forgot Password?
              </span>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          New patient?{' '}
          <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>

      {/* Simulated Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '420px', width: '90%', boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Recover Password
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              Enter your registered email address below to receive password recovery instructions.
            </p>

            {forgotMessage ? (
              <div style={{
                backgroundColor: 'rgba(20, 184, 166, 0.15)', border: '1px solid var(--accent-teal)',
                color: 'var(--accent-teal)', padding: '0.75rem', borderRadius: 'var(--border-radius)',
                fontSize: '0.88rem', textAlign: 'center', marginBottom: '1.5rem'
              }}>
                {forgotMessage}
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await api.post('/auth/forgot-password', { email: forgotEmail });
                  setForgotMessage('✅ ' + res.message);
                  setTimeout(() => {
                    setShowForgotModal(false);
                    setForgotMessage('');
                    setForgotEmail('');
                  }, 4000);
                } catch (err) {
                  alert(err.message || 'No account associated with this email address exists.');
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@hospital.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '1rem' }}>
                  Send Recovery Link
                </button>
              </form>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setShowForgotModal(false);
                setForgotMessage('');
                setForgotEmail('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
