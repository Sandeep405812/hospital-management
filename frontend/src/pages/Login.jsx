import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

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
          <p className="auth-subtitle">Login to access your medical dashboard</p>
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
            <label className="form-label">Password</label>
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
          }}
        >
          <strong>Default Admin Demo Account:</strong>
          <br />
          Email: <code style={{ color: 'var(--accent-teal)' }}>admin@hospital.com</code>
          <br />
          Password: <code style={{ color: 'var(--accent-teal)' }}>adminpassword123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
