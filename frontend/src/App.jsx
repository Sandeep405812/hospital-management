import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div style={{ marginTop: '1.5rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
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
