import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { io } from 'socket.io-client';
import { BACKEND_URL } from './utils/api';
import { Phone, PhoneOff, Video } from 'lucide-react';
import gsap from 'gsap';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Prescriptions from './pages/Prescriptions';
import Billing from './pages/Billing';
import Departments from './pages/Departments';
import Profile from './pages/Profile';
import CallRoom from './pages/CallRoom';
import Checkout from './pages/Checkout';
import Reports from './pages/Reports';
import Metrics from './pages/Metrics';
import SymptomChecker from './pages/SymptomChecker';

// Protected Route Guard
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Validating user credentials...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Guest / Public Route Guard
const GuestRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Verifying session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Main Dashboard Layout
const DashboardLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [incomingCall, setIncomingCall] = React.useState(null);
  const globalSocketRef = React.useRef(null);

  React.useEffect(() => {
    if (!user) return;

    // Connect to the global socket using the base origin to avoid subpath errors
    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn("Invalid BACKEND_URL:", BACKEND_URL);
    }
    
    const socket = io(socketUrl);
    globalSocketRef.current = socket;

    // Register this user session
    socket.emit('register-user', { userId: user._id });

    // Listen for incoming call notifications
    socket.on('incoming-call', ({ roomId, doctorName }) => {
      setIncomingCall({ roomId, doctorName });
    });

    // Listen for call cancellations
    socket.on('call-cancelled', () => {
      setIncomingCall(null);
    });

    return () => {
      socket.disconnect();
      globalSocketRef.current = null;
    };
  }, [user]);

  React.useEffect(() => {
    if (incomingCall) {
      setTimeout(() => {
        gsap.fromTo('.incoming-call-modal',
          { scale: 0.8, opacity: 0, rotation: -2 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.75)' }
        );
      }, 50);
    }
  }, [incomingCall]);

  React.useEffect(() => {
    gsap.fromTo('.page-transition-wrapper',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );
  }, [location.pathname]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      navigate(`/appointments/${incomingCall.roomId}/call`);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall && globalSocketRef.current) {
      globalSocketRef.current.emit('reject-call', { roomId: incomingCall.roomId });
      setIncomingCall(null);
    }
  };

  return (
    <div className={`dashboard-layout ${sidebarOpen ? 'sidebar-active' : ''}`}>
      {/* Floating Incoming Call Modal Popup */}
      {incomingCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div className="incoming-call-modal" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '2.5rem',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-teal)',
              margin: '0 auto 1.5rem',
              animation: 'pulse 1.8s infinite',
            }}>
              <Phone size={36} style={{ animation: 'shake 0.5s infinite' }} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Incoming Video Call
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Dr. <strong>{incomingCall.doctorName}</strong> is calling you for consultation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={handleAcceptCall}
                className="btn btn-teal"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                  padding: '0.8rem',
                }}
              >
                <Video size={18} />
                <span>Accept</span>
              </button>

              <button 
                onClick={handleRejectCall}
                className="btn btn-danger"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  padding: '0.8rem',
                }}
              >
                <PhoneOff size={18} />
                <span>Reject</span>
              </button>
            </div>
          </div>
          
          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4); }
              70% { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(20, 184, 166, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
            }
            @keyframes shake {
              0% { transform: rotate(0); }
              15% { transform: rotate(15deg); }
              30% { transform: rotate(-15deg); }
              45% { transform: rotate(10deg); }
              60% { transform: rotate(-10deg); }
              75% { transform: rotate(4deg); }
              85% { transform: rotate(-4deg); }
              100% { transform: rotate(0); }
            }
          `}</style>
        </div>
      )}

      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 13, 22, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="page-transition-wrapper" style={{ marginTop: '1.5rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      const reminders = JSON.parse(localStorage.getItem('medicine_reminders') || '[]');
      
      reminders.forEach((rem) => {
        if (rem.time === currentTime) {
          const lastTriggerKey = `last_triggered_${rem.id}_${currentTime}`;
          if (!localStorage.getItem(lastTriggerKey)) {
            new Notification('💊 AS HOSPITAL Medicine Reminder', {
              body: `Time to take your medicine: ${rem.name} (${rem.dosage})`,
            });
            localStorage.setItem(lastTriggerKey, 'true');
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Guest routes */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/:id/call" element={<CallRoom />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/prescriptions" element={<Prescriptions />} />
              <Route path="/departments" element={<Departments />} />

              {/* Admin & Patient only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'patient']} />}>
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/billing/:id/checkout" element={<Checkout />} />
              </Route>

              {/* Patient only */}
              <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
                <Route path="/reports" element={<Reports />} />
                <Route path="/metrics" element={<Metrics />} />
                <Route path="/symptom-checker" element={<SymptomChecker />} />
              </Route>

              {/* Admin & Doctor only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'doctor']} />}>
                <Route path="/patients" element={<Patients />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
