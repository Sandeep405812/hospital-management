import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  Layers,
  Activity,
  PlusCircle,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    doctors: 0,
    patients: 0,
    appointments: 0,
    earnings: 0,
    departments: 0,
    prescriptions: 0,
    unpaidBills: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [adminLedger, setAdminLedger] = useState([]);
  const [billingAnalytics, setBillingAnalytics] = useState(null);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data based on role
        if (user.role === 'admin') {
          const docs = await api.get('/doctors');
          const pats = await api.get('/patients');
          const apps = await api.get('/appointments');
          const depts = await api.get('/departments');
          const bills = await api.get('/billing');

          const totalEarnings = bills
            .filter((b) => b.status === 'paid')
            .reduce((sum, b) => sum + b.total, 0);

          setStats({
            doctors: docs.length,
            patients: pats.length,
            appointments: apps.length,
            earnings: totalEarnings,
            departments: depts.length,
          });

          // Show last 5 appointments
          setRecentAppointments(apps.slice(0, 5));
          setAdminLedger(bills);

          // Fetch Analytics
          const bAnalytics = await api.get('/billing/analytics');
          const aAnalytics = await api.get('/appointments/analytics');
          setBillingAnalytics(bAnalytics);
          setAppointmentAnalytics(aAnalytics);
        } else if (user.role === 'doctor') {
          const apps = await api.get('/appointments');
          const scripts = await api.get('/prescriptions');

          // Filter unique patients for this doctor
          const myPatients = new Set(apps.map((a) => a.patient?._id)).size;

          setStats({
            appointments: apps.length,
            pendingAppointments: apps.filter((a) => a.status === 'pending').length,
            prescriptions: scripts.length,
            patients: myPatients,
          });
          setRecentAppointments(apps.slice(0, 5));

          // Fetch Analytics
          const aAnalytics = await api.get('/appointments/analytics');
          setAppointmentAnalytics(aAnalytics);
        } else if (user.role === 'patient') {
          const apps = await api.get('/appointments');
          const scripts = await api.get('/prescriptions');
          const bills = await api.get('/billing');

          const unpaidCount = bills.filter((b) => b.status === 'unpaid').length;

          setStats({
            appointments: apps.length,
            prescriptions: scripts.length,
            unpaidBills: unpaidCount,
          });
          setRecentAppointments(apps.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Staggered entry animations for Dashboard elements when loaded
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.page-title, .page-subtitle', 
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }
      );
      
      gsap.fromTo('.stat-card', 
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)', stagger: 0.08 }
      );
      
      gsap.fromTo('.dashboard-section', 
        { opacity: 0, y: 45 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15 }
      );
    }
  }, [loading]);

  // Chart Renderers
  const renderRevenueChart = () => {
    if (!billingAnalytics || !billingAnalytics.monthlyRevenue) return null;
    const data = Object.entries(billingAnalytics.monthlyRevenue);
    if (data.length === 0) return null;

    const width = 450;
    const height = 180;
    const paddingX = 40;
    const paddingY = 30;

    const values = data.map(([_, val]) => val);
    const maxVal = Math.max(...values, 1000);

    const chartWidth = width - 2 * paddingX;
    const chartHeight = height - 2 * paddingY;
    const barWidth = Math.min(40, (chartWidth / data.length) * 0.6);
    const gap = (chartWidth - barWidth * data.length) / (data.length - 1 || 1);

    return (
      <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Monthly Revenue Trend</h3>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="180">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-teal)" />
              <stop offset="100%" stopColor="var(--accent-blue)" />
            </linearGradient>
          </defs>
          
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.1)" />

          {data.map(([month, val], idx) => {
            const x = paddingX + idx * (barWidth + gap);
            const barHeight = (val / maxVal) * chartHeight;
            const y = height - paddingY - barHeight;
            const monthLabel = month.slice(-2);

            return (
              <g key={month}>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill="url(#barGradient)" />
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="600">
                  ₹{val}
                </text>
                <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
                  M {monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderStatusDonutChart = () => {
    if (!appointmentAnalytics || !appointmentAnalytics.statusCounts) return null;
    const counts = appointmentAnalytics.statusCounts;
    const total = appointmentAnalytics.totalCount || 0;

    if (total === 0) return null;

    const items = [
      { key: 'completed', color: 'var(--success)', label: 'Completed' },
      { key: 'approved', color: 'var(--accent-teal)', label: 'Approved' },
      { key: 'pending', color: 'var(--warning)', label: 'Pending' },
      { key: 'cancelled', color: 'var(--danger)', label: 'Cancelled' }
    ].filter(item => (counts[item.key] || 0) > 0);

    const radius = 45;
    const circum = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Appointment Status Ratios</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            
            {items.map((item) => {
              const count = counts[item.key] || 0;
              const percent = count / total;
              const strokeLength = percent * circum;
              const strokeOffset = circum - strokeLength + (accumulatedPercent * circum);
              accumulatedPercent -= percent;

              return (
                <circle
                  key={item.key}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} ${circum}`}
                  strokeDashoffset={strokeOffset}
                />
              );
            })}
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
            {items.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }}></span>
                <span style={{ fontWeight: 600 }}>{counts[item.key]}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentLoads = () => {
    if (!appointmentAnalytics || !appointmentAnalytics.departmentCounts) return null;
    const depts = Object.entries(appointmentAnalytics.departmentCounts);
    const total = appointmentAnalytics.totalCount || 1;
    if (depts.length === 0) return null;

    return (
      <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Department Loads</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {depts.slice(0, 4).map(([name, count]) => {
            const percentage = Math.round((count / total) * 100);
            return (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{count} ({percentage}%)</span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: 'var(--accent-teal)', borderRadius: '4px' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard details...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name}</h1>
          <p className="page-subtitle">Here is what's happening at AS HOSPITAL today</p>
        </div>
        {user.role === 'patient' && (
          <Link to="/appointments" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Book Appointment</span>
          </Link>
        )}
      </div>

      {/* Admin Stat Grid */}
      {user.role === 'admin' && (
        <div className="dashboard-grid">
          <StatCard
            title="Total Doctors"
            value={stats.doctors}
            icon={<Activity size={24} />}
            colorClass="blue"
          />
          <StatCard
            title="Total Patients"
            value={stats.patients}
            icon={<Users size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Appointments"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="warning"
          />
          <StatCard
            title="Total Earnings"
            value={`₹${stats.earnings}`}
            icon={<CreditCard size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Doctor Stat Grid */}
      {user.role === 'doctor' && (
        <div className="dashboard-grid">
          <StatCard
            title="My Appointments"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="blue"
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingAppointments}
            icon={<Activity size={24} />}
            colorClass="warning"
          />
          <StatCard
            title="Prescriptions Issued"
            value={stats.prescriptions}
            icon={<FileText size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Unique Patients"
            value={stats.patients}
            icon={<Users size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Patient Stat Grid */}
      {user.role === 'patient' && (
        <div className="dashboard-grid">
          <StatCard
            title="My Bookings"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="blue"
          />
          <StatCard
            title="Prescriptions"
            value={stats.prescriptions}
            icon={<FileText size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Unpaid Invoices"
            value={stats.unpaidBills}
            icon={<CreditCard size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Admin Visual Charts Section */}
      {user.role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
          {renderRevenueChart()}
          {renderStatusDonutChart()}
        </div>
      )}

      {/* Doctor Visual Charts Section */}
      {user.role === 'doctor' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
          {renderStatusDonutChart()}
          {renderDepartmentLoads()}
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Appointments</h2>
          <Link
            to="/appointments"
            style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 600 }}
          >
            View All
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
            No appointments found.
          </p>
        ) : (
          <Table
            headers={
              user.role === 'patient'
                ? ['Doctor', 'Date', 'Time Slot', 'Symptoms', 'Status']
                : ['Patient', 'Date', 'Time Slot', 'Symptoms', 'Status']
            }
          >
            {recentAppointments.map((app) => (
              <tr key={app._id}>
                {user.role === 'patient' ? (
                  <td>{app.doctor?.user?.name || 'N/A'}</td>
                ) : (
                  <td>{app.patient?.user?.name || 'N/A'}</td>
                )}
                <td>{new Date(app.date).toLocaleDateString()}</td>
                <td>{app.timeSlot}</td>
                <td>{app.symptoms}</td>
                <td>
                  <span className={`badge badge-${app.status}`}>{app.status}</span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Admin Financial Audit Ledger Section */}
      {user.role === 'admin' && (
        <div className="dashboard-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="section-title">Admin Financial Audit Ledger</h2>
            <Link
              to="/billing"
              style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 600 }}
            >
              View Invoices
            </Link>
          </div>

          {adminLedger.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
              No transactions recorded yet.
            </p>
          ) : (
            <Table headers={['Invoice ID', 'Patient Name', 'Amount', 'Payment Method', 'Transaction ID', 'Status']}>
              {adminLedger.map((bill) => (
                <tr key={bill._id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{bill._id.slice(-6).toUpperCase()}</td>
                  <td>{bill.patient?.user?.name || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>₹{bill.total}</td>
                  <td>{bill.paymentMethod || 'N/A'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{bill.transactionId || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${bill.status}`}>{bill.status}</span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
