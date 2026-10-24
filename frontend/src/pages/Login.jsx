import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import gsap from 'gsap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Forgot / Reset Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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
          <p className="auth-subtitle">Sign in to access your hospital account</p>
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
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 0
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '1.25rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          New patient?{' '}
          <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>

      {/* Interactive Forgot & Reset Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '440px', width: '92%', boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              {forgotStep === 1 ? '🔑 Recover Password' : '🔒 Set New Password'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              {forgotStep === 1
                ? 'Enter your registered email address to locate and verify your account.'
                : `Account verified for ${verifiedName || 'User'}! Please choose a new secure password.`}
            </p>

            {forgotError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)',
                color: 'var(--danger)', padding: '0.65rem 0.75rem', borderRadius: 'var(--border-radius)',
                fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.2rem'
              }}>
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div style={{
                backgroundColor: 'rgba(20, 184, 166, 0.15)', border: '1px solid var(--accent-teal)',
                color: 'var(--accent-teal)', padding: '0.75rem', borderRadius: 'var(--border-radius)',
                fontSize: '0.88rem', textAlign: 'center', marginBottom: '1.2rem', fontWeight: 600
              }}>
                {forgotSuccess}
              </div>
            )}

            {/* STEP 1: Verify Account by Email */}
            {forgotStep === 1 && !forgotSuccess && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setForgotError('');
                setForgotLoading(true);
                try {
                  const res = await api.post('/auth/forgot-password', { email: forgotEmail });
                  setVerifiedName(res.name || '');
                  setForgotStep(2);
                } catch (err) {
                  setForgotError(err.message || 'No account associated with this email address exists.');
                } finally {
                  setForgotLoading(false);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Registered Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. user@hospital.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-teal btn-full" disabled={forgotLoading} style={{ marginTop: '0.5rem' }}>
                  {forgotLoading ? 'Verifying Account...' : 'Verify & Continue →'}
                </button>
              </form>
            )}

            {/* STEP 2: Set New Password */}
            {forgotStep === 2 && !forgotSuccess && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setForgotError('');

                if (newPassword.length < 6) {
                  setForgotError('New password must be at least 6 characters long');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setForgotError('Passwords do not match. Please re-enter.');
                  return;
                }

                setForgotLoading(true);
                try {
                  const res = await api.post('/auth/reset-password', {
                    email: forgotEmail,
                    newPassword
                  });
                  setForgotSuccess('✅ ' + (res.message || 'Password successfully updated!'));
                  // Auto-fill login field with the recovered email
                  setEmail(forgotEmail);
                  setPassword('');
                  setTimeout(() => {
                    setShowForgotModal(false);
                    setForgotStep(1);
                    setForgotEmail('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setForgotSuccess('');
                    setForgotError('');
                  }, 2200);
                } catch (err) {
                  setForgotError(err.message || 'Failed to reset password. Please try again.');
                } finally {
                  setForgotLoading(false);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0
                      }}
                    >
                      {showNewPassword ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-teal btn-full" disabled={forgotLoading} style={{ marginTop: '0.5rem' }}>
                  {forgotLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep(1);
                setForgotEmail('');
                setNewPassword('');
                setConfirmPassword('');
                setForgotError('');
                setForgotSuccess('');
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
