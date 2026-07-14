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

  useEffect(() => {
    if (activeRole === 'patient') {
      setEmail('patient@hospital.com');
      setPassword('patientpassword123');
    } else if (activeRole === 'doctor') {
      setEmail('doctor@hospital.com');
      setPassword('doctorpassword123');
    } else if (activeRole === 'admin') {
      setEmail('admin@hospital.com');
      setPassword('adminpassword123');
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
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: 'var(--bg-primary)', padding: '0.3rem', borderRadius: 'var(--border-radius-sm)' }}>
          {['patient', 'doctor', 'admin'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              style={{
                flex: 1,
                padding: '0.45rem 0.6rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
                backgroundColor: activeRole === role ? 'var(--accent-teal)' : 'transparent',
                color: activeRole === role ? '#fff' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              {role}
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

        <div
          style={{
            marginTop: '2rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            border: '1px dashed rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div>
            <strong>Demo Patient Account:</strong> <code>patient@hospital.com</code> / <code>patientpassword123</code>
          </div>
          <div>
            <strong>Demo Doctor Account:</strong> <code>doctor@hospital.com</code> / <code>doctorpassword123</code>
          </div>
          <div>
            <strong>Demo Admin Account:</strong> <code>admin@hospital.com</code> / <code>adminpassword123</code>
          </div>
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
